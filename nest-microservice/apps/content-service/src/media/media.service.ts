import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AuthUser,
  CreateMediaUploadDto,
  MEDIA_MAX_WIDTH,
  MediaResponse,
  MediaUploadResponse,
  OBJECT_STORAGE,
  ObjectStorage,
  paginate,
  Paginated,
  PaginationQueryDto,
  ValidationProblemException,
  type MediaContentType,
  type MediaSource,
  type MediaStatus,
} from '@app/common';
import type { Media } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { MediaUrls, StoredVariant, variantsOf } from './media-urls';

/**
 * The media library of a site (ADR 0034). Images are optimized by the admin's browser, then:
 *
 *   1. createUpload  checks the declared sizes, stores a `pending` row, answers one presigned PUT
 *                    per size (public bucket, Content-Type and Content-Length signed)
 *   2. complete      HEAD on every size: present, same size and type → `ready`; otherwise the
 *                    objects and the row are deleted (422 upload_mismatch)
 *   3. remove        refused while an article uses the image (cover or body: 409 media_in_use)
 *
 * Every call checks the site first (SitesService.getAccessible: 404 for a site you don't manage);
 * an image of another site answers 404. Pending uploads older than a day: MediaCleanupService.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly urls: MediaUrls,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async findAll(
    siteId: string,
    query: PaginationQueryDto,
    user: AuthUser,
  ): Promise<Paginated<MediaResponse>> {
    await this.sites.getAccessible(siteId, user);
    const { page, limit } = query;
    const where = { siteId, status: 'ready' };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.media.count({ where }),
    ]);
    return paginate(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async createUpload(
    siteId: string,
    dto: CreateMediaUploadDto,
    user: AuthUser,
  ): Promise<MediaUploadResponse> {
    await this.sites.getAccessible(siteId, user);
    const variants = checkVariants(dto.variants);
    const widest = variants[variants.length - 1];

    const row = await this.prisma.media.create({
      data: {
        id: randomUUID(),
        siteId,
        filename: displayName(dto.filename),
        contentType: dto.contentType,
        width: widest.width,
        height: widest.height,
        variants,
        createdBy: user.id,
      },
    });
    const uploads = await Promise.all(
      variants.map(async (v) => ({
        width: v.width,
        ...(await this.storage.createUploadUrl({
          visibility: 'public',
          key: this.urls.key(siteId, row.id, v.width, dto.contentType),
          contentType: dto.contentType,
          size: v.size,
        })),
      })),
    );
    return { media: this.toResponse(row), uploads };
  }

  async complete(siteId: string, id: string, user: AuthUser): Promise<MediaResponse> {
    await this.sites.getAccessible(siteId, user);
    const media = await this.getOrFail(siteId, id);
    if (media.status === 'ready') return this.toResponse(media); // idempotent
    if (media.source !== 'upload' || media.status !== 'pending') {
      throw new NotFoundException(`Upload ${id} not found`); // AI images are completed by events
    }

    const keys = this.keysOf(media);
    const stored = await Promise.all(keys.map((k) => this.storage.stat('public', k.key)));
    if (stored.some((s) => !s)) {
      throw new ConflictException({
        message: 'Not every size has been uploaded yet (or the upload URL expired)',
        code: 'upload_incomplete',
      });
    }
    const mismatch = stored.some(
      (s, i) => s!.size !== keys[i].size || mediaType(s!.contentType) !== media.contentType,
    );
    if (mismatch) {
      // Something else than what was declared and checked: never keep it.
      await this.deleteObjects(media);
      await this.prisma.media.deleteMany({ where: { id, siteId, status: 'pending' } });
      throw new UnprocessableEntityException({
        message: 'An uploaded size does not match the declared size or content type',
        code: 'upload_mismatch',
      });
    }

    // Conditional: two concurrent completions can't both "win".
    await this.prisma.media.updateMany({
      where: { id, siteId, status: 'pending' },
      data: { status: 'ready', uploadedAt: new Date() },
    });
    return this.toResponse(await this.getOrFail(siteId, id));
  }

  /** Deleted for real (objects first: a failure leaves the row, so it can be retried). */
  async remove(siteId: string, id: string, user: AuthUser): Promise<void> {
    await this.sites.getAccessible(siteId, user);
    const media = await this.getOrFail(siteId, id);
    if (media.source === 'ai' && media.status === 'pending') {
      // ai-service is about to write its files: deleting now would leave them behind.
      throw new ConflictException({
        message: 'The image is still being generated: delete it once it is ready',
        code: 'generation_in_progress',
      });
    }
    await this.assertUnused(media);
    await this.deleteObjects(media);
    // The cover foreign key (RESTRICT) still guards a cover set in between: 409 from the database.
    const { count } = await this.prisma.media.deleteMany({ where: { id, siteId } });
    if (!count) throw new NotFoundException(`Image ${id} not found`); // deleted in between
  }

  /** For articles: a READY image of this site, or 422 invalid_cover. */
  async assertCover(siteId: string, id: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: { id, siteId, status: 'ready' },
      select: { id: true },
    });
    if (!media) {
      throw new UnprocessableEntityException({
        message: `coverMediaId ${id} is not an uploaded image of this site`,
        code: 'invalid_cover',
      });
    }
  }

  /**
   * Pending uploads and AI images that never came (or failed) older than `before`: their objects
   * and rows (MediaCleanupService). ai-service answers within ~25 minutes, so a day is plenty.
   */
  async purgePending(before: Date, take = 100): Promise<number> {
    const rows = await this.prisma.media.findMany({
      where: { status: { in: ['pending', 'failed'] }, createdAt: { lt: before } },
      orderBy: { createdAt: 'asc' },
      take,
    });
    let purged = 0;
    for (const media of rows) {
      try {
        await this.deleteObjects(media);
        purged += (
          await this.prisma.media.deleteMany({ where: { id: media.id, status: media.status } })
        ).count;
      } catch (error) {
        this.logger.warn({ mediaId: media.id, err: error }, 'Could not purge a pending upload');
      }
    }
    return purged;
  }

  toResponse(row: Media): MediaResponse {
    return {
      ...this.urls.image(row),
      siteId: row.siteId,
      filename: row.filename,
      contentType: row.contentType as MediaContentType,
      status: row.status as MediaStatus,
      source: row.source as MediaSource,
      prompt: row.prompt,
      error: row.error,
      variants: variantsOf(row).map((v) => ({ ...v, url: this.urls.variantUrl(row, v.width) })),
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async getOrFail(siteId: string, id: string): Promise<Media> {
    const media = await this.prisma.media.findFirst({ where: { id, siteId } });
    if (!media) throw new NotFoundException(`Image ${id} not found`);
    return media;
  }

  /** Used as a cover, or in a body (its URLs contain `/<id>/`): 409 media_in_use. */
  private async assertUnused(media: Media): Promise<void> {
    const [covers, bodies] = await this.prisma.$transaction([
      this.prisma.article.count({ where: { siteId: media.siteId, coverMediaId: media.id } }),
      this.prisma.articleTranslation.count({
        where: { siteId: media.siteId, body: { contains: `/${media.id}/` } },
      }),
    ]);
    if (covers || bodies) {
      throw new ConflictException({
        message: `The image is used by ${covers + bodies} article(s): remove it from them first`,
        code: 'media_in_use',
      });
    }
  }

  private keysOf(media: Media): { key: string; size: number }[] {
    return variantsOf(media).map((v) => ({
      key: this.urls.key(media.siteId, media.id, v.width, media.contentType as MediaContentType),
      size: v.size,
    }));
  }

  private async deleteObjects(media: Media): Promise<void> {
    await Promise.all(this.keysOf(media).map((k) => this.storage.delete('public', k.key)));
  }
}

/**
 * The sizes, narrowest first: distinct widths, all of one image (same aspect ratio, within
 * rounding), at most MEDIA_MAX_WIDTH wide. Anything else is 400 with the field errors.
 */
export function checkVariants(input: StoredVariant[]): StoredVariant[] {
  const variants = [...input]
    .map(({ width, height, size }) => ({ width, height, size }))
    .sort((a, b) => a.width - b.width);
  const widest = variants[variants.length - 1];
  const errors: { field: string; message: string }[] = [];
  variants.forEach((v, i) => {
    if (i > 0 && v.width === variants[i - 1].width) {
      errors.push({ field: `variants.${i}.width`, message: 'widths must be distinct' });
    }
    const expected = (widest.height * v.width) / widest.width;
    if (Math.abs(v.height - expected) > Math.max(2, expected * 0.01)) {
      errors.push({
        field: `variants.${i}.height`,
        message: 'every size must keep the same ratio',
      });
    }
  });
  if (widest.width > MEDIA_MAX_WIDTH) {
    errors.push({ field: 'variants', message: `at most ${MEDIA_MAX_WIDTH} pixels wide` });
  }
  if (errors.length) throw new ValidationProblemException(errors);
  return variants;
}

/** The user's file name, for display only (keys never use it): no path, no control characters. */
function displayName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (clean || 'image').slice(0, 200);
}

/** `image/webp; charset=x` → `image/webp`. */
function mediaType(value: string | undefined): string {
  return (value ?? '').split(';')[0].trim().toLowerCase();
}
