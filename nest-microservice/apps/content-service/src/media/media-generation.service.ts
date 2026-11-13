import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  addToOutbox,
  AuthUser,
  GenerateMediaDto,
  IMAGE_GENERATION_EVENTS,
  ImageGenerationCompletedEvent,
  ImageGenerationFailedEvent,
  ImageGenerationRequestedEvent,
  MEDIA_CONTENT_TYPES,
  MEDIA_MAX_WIDTH,
  MediaGenerationResponse,
  OutboxRelay,
  type ImageAspectRatio,
  type MediaContentType,
} from '@app/common';
import { REQUESTER } from '../common/ai';
import type { ImageGenerationJob, Media, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import type { StoredVariant } from './media-urls';
import { MediaService } from './media.service';

type Tx = Prisma.TransactionClient;
type JobWithMedia = ImageGenerationJob & { media: Media[] };

/** What a pending row says until its image exists: the ratio (e.g. 16 × 9), for placeholders. */
function ratioOf(aspectRatio: ImageAspectRatio): [number, number] {
  const [w, h] = aspectRatio.split(':').map(Number);
  return [w, h];
}

/** First instant of the current calendar month, UTC: the quota window. */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * AI images in the media library (ADR 0037). `generate` checks the site's monthly quota, stores
 * a job and one PENDING `source: ai` row per image, and asks ai-service through the outbox (same
 * transaction); ai-service writes the optimized WebP sizes to `media/<site>/<id>/` itself. Its
 * answer (AiResultsConsumer → `complete` / `fail`, inside the inbox transaction) turns each row
 * `ready` or `failed`. The admin polls `get`. Quota: Σ images per site and calendar month (UTC),
 * counted from the jobs (never deleted), so deleting an image does not give it back.
 */
@Injectable()
export class MediaGenerationService {
  private readonly logger = new Logger(MediaGenerationService.name);
  private readonly perMonth: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly media: MediaService,
    private readonly outbox: OutboxRelay,
    config: ConfigService,
  ) {
    this.perMonth = config.getOrThrow<number>('CONTENT_AI_IMAGES_PER_MONTH');
  }

  async generate(
    siteId: string,
    dto: GenerateMediaDto,
    user: AuthUser,
  ): Promise<MediaGenerationResponse> {
    await this.sites.getAccessible(siteId, user);
    const { jobId, remaining } = await this.prisma.$transaction((tx) =>
      this.request(tx, siteId, dto.prompt.trim(), dto.aspectRatio, dto.count, user.id),
    );
    this.outbox.poke();
    return this.answer(await this.getJob(siteId, jobId), remaining);
  }

  /**
   * The job, its pending rows and the event, in the CALLER's transaction (the caller pokes the
   * outbox after the commit). 422 quota_exceeded when the month has fewer images left.
   */
  async request(
    tx: Tx,
    siteId: string,
    prompt: string,
    aspectRatio: ImageAspectRatio,
    count: number,
    actorId: string,
  ): Promise<{ jobId: string; mediaIds: string[]; remaining: number }> {
    const [width, height] = ratioOf(aspectRatio);
    const jobId = randomUUID();
    const ids = Array.from({ length: count }, () => randomUUID());
    // One request per site at a time past this point: two can't both take the last images.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-images:${siteId}`}))`;
    const left = this.perMonth - (await this.used(tx, siteId));
    if (count > left) {
      throw new UnprocessableEntityException({
        message: `This site can generate ${Math.max(left, 0)} more image(s) this month (limit ${this.perMonth})`,
        code: 'quota_exceeded',
      });
    }
    await tx.imageGenerationJob.create({
      data: {
        id: jobId,
        siteId,
        prompt,
        aspectRatio,
        count,
        createdBy: actorId,
      },
    });
    await tx.media.createMany({
      data: ids.map((id) => ({
        id,
        siteId,
        source: 'ai',
        prompt,
        generationJobId: jobId,
        filename: `${prompt.slice(0, 60)}.webp`,
        contentType: 'image/webp',
        width,
        height,
        variants: [],
        createdBy: actorId,
      })),
    });
    await addToOutbox(tx, IMAGE_GENERATION_EVENTS.REQUESTED, {
      jobId,
      requester: REQUESTER,
      siteId,
      prompt,
      aspectRatio,
      targets: ids.map((mediaId) => ({ mediaId, keyPrefix: `media/${siteId}/${mediaId}/` })),
      actorId,
    } satisfies ImageGenerationRequestedEvent);
    return { jobId, mediaIds: ids, remaining: left - count };
  }

  /** Polled by the admin until the job is no longer pending. Another site's job answers 404. */
  async get(siteId: string, jobId: string, user: AuthUser): Promise<MediaGenerationResponse> {
    await this.sites.getAccessible(siteId, user);
    const job = await this.getJob(siteId, jobId);
    return this.answer(job, this.perMonth - (await this.used(this.prisma, siteId)));
  }

  /** ai-service made some (or all) of the images: they are in storage already. */
  async complete(tx: Tx, event: ImageGenerationCompletedEvent): Promise<void> {
    const job = await this.pendingJob(tx, event);
    if (!job) return;
    const now = new Date();
    let made = 0;
    for (const image of event.images) {
      const variants = checkGenerated(image.contentType, image.variants);
      if (!variants) {
        this.logger.warn({ jobId: job.id, mediaId: image.mediaId }, 'Unusable generated image');
        continue;
      }
      const widest = variants[variants.length - 1];
      // Only this job's rows, only while pending (a duplicate or late answer changes nothing).
      const { count } = await tx.media.updateMany({
        where: {
          id: image.mediaId,
          siteId: job.siteId,
          generationJobId: job.id,
          status: 'pending',
        },
        data: {
          status: 'ready',
          contentType: image.contentType,
          width: widest.width,
          height: widest.height,
          variants,
          uploadedAt: now,
        },
      });
      made += count;
    }
    // The rest got no image (each failure is logged by ai-service).
    await tx.media.updateMany({
      where: { generationJobId: job.id, status: 'pending' },
      data: { status: 'failed', error: 'not_generated' },
    });
    await tx.imageGenerationJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        generated: made,
        provider: event.provider.slice(0, 30),
        model: event.model.slice(0, 100),
        completedAt: now,
      },
    });
    this.logger.log(`Image generation ${job.id}: ${made}/${job.count} image(s) ready`);
  }

  /** No image at all: every row of the job fails; the quota gives them back (generated 0). */
  async fail(tx: Tx, event: ImageGenerationFailedEvent): Promise<void> {
    const job = await this.pendingJob(tx, event);
    if (!job) return;
    await tx.media.updateMany({
      where: { generationJobId: job.id, status: 'pending' },
      data: { status: 'failed', error: event.reason },
    });
    await tx.imageGenerationJob.update({
      where: { id: job.id },
      data: { status: 'failed', generated: 0, error: event.reason, completedAt: new Date() },
    });
    this.logger.warn(`Image generation ${job.id} failed: ${event.reason}`);
  }

  /** Images counted this month: made ones once known, otherwise the ones asked for. */
  private async used(db: Tx | PrismaService, siteId: string): Promise<number> {
    const jobs = await db.imageGenerationJob.findMany({
      where: { siteId, createdAt: { gte: monthStart() } },
      select: { count: true, generated: true },
    });
    return jobs.reduce((sum, j) => sum + (j.generated ?? j.count), 0);
  }

  private async getJob(siteId: string, jobId: string): Promise<JobWithMedia> {
    const job = await this.prisma.imageGenerationJob.findFirst({
      where: { id: jobId, siteId },
      include: { media: { orderBy: { id: 'asc' } } },
    });
    if (!job) throw new NotFoundException(`Image generation ${jobId} not found`);
    return job;
  }

  /** The job this answer is for, if it's still waiting for one (else acked and ignored). */
  private async pendingJob(
    tx: Tx,
    event: { jobId: string; siteId: string },
  ): Promise<ImageGenerationJob | null> {
    const job = await tx.imageGenerationJob.findUnique({ where: { id: event.jobId } });
    if (!job || job.siteId !== event.siteId || job.status !== 'pending') {
      this.logger.warn(`Image generation ${event.jobId}: unknown or already answered, ignored`);
      return null;
    }
    return job;
  }

  private answer(job: JobWithMedia, remaining: number): MediaGenerationResponse {
    return {
      jobId: job.id,
      status: job.status as MediaGenerationResponse['status'],
      media: job.media.map((row) => this.media.toResponse(row)),
      remaining: Math.max(remaining, 0),
    };
  }
}

/** What ai-service reports must look like an image the library could have stored itself. */
function checkGenerated(
  contentType: string,
  input: { width: number; height: number; size: number }[],
): StoredVariant[] | null {
  if (!MEDIA_CONTENT_TYPES.includes(contentType as MediaContentType)) return null;
  const variants = input
    .map(({ width, height, size }) => ({ width, height, size }))
    .sort((a, b) => a.width - b.width);
  const widest = variants[variants.length - 1];
  if (!widest || widest.width > MEDIA_MAX_WIDTH) return null;
  return variants;
}
