import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  handleOnce,
  IMAGE_GENERATION_EVENTS,
  OBJECT_STORAGE,
  OutboxRelay,
  type GeneratedImage,
  type ImageGenerationCompletedEvent,
  type ImageGenerationFailedEvent,
  type ImageGenerationRequestedEvent,
  type ObjectStorage,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { ProviderRefusedError } from '../translation/providers/translation-provider';
import { CONSUMER, type Delivery } from '../translation/translation.service';
import { optimizeImage } from './image-optimizer';
import { IMAGE_PROVIDER, type ImageProvider } from './providers/image-provider';

/** Objects of a media id never change (a new image is a new id): cache them forever. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Generates the images of one request (ADR 0037): one provider call per target, in parallel,
 * each optimized (WebP sizes) and written under the target's key prefix in the public bucket.
 *
 *   ≥ 1 image                         → usage rows + events.image-generation.completed (the
 *                                       targets without an image are reported missing)
 *   none, a refusal                   → events.image-generation.failed (provider_refused)
 *   none, transient, not last attempt → thrown: JetStream retries
 *   none, transient, last attempt     → events.image-generation.failed (provider_unavailable)
 *
 * Images already made are never thrown away to retry the others: each one is paid for.
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(IMAGE_PROVIDER) private readonly provider: ImageProvider,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async generate(event: ImageGenerationRequestedEvent, delivery: Delivery): Promise<void> {
    const seen = await this.prisma.inboxMessage.findUnique({
      where: { consumer_messageId: { consumer: CONSUMER, messageId: delivery.id } },
      select: { messageId: true },
    });
    if (seen) return;

    const started = Date.now();
    const outcomes = await Promise.allSettled(
      event.targets.map(async (target) => {
        // Only inside this site's media area, whatever the event says.
        if (!target.keyPrefix.startsWith(`media/${event.siteId}/${target.mediaId}/`)) {
          throw new ProviderRefusedError(`target ${target.mediaId} is outside the site's media`);
        }
        const picture = await this.provider.generate({
          prompt: event.prompt,
          aspectRatio: event.aspectRatio,
        });
        const variants = await optimizeImage(picture.data);
        await Promise.all(
          variants.map((v) =>
            this.storage.putObject({
              visibility: 'public',
              key: `${target.keyPrefix}${v.width}.webp`,
              contentType: 'image/webp',
              body: v.data,
              cacheControl: IMMUTABLE,
            }),
          ),
        );
        const image: GeneratedImage = {
          mediaId: target.mediaId,
          contentType: 'image/webp',
          variants: variants.map(({ width, height, data }) => ({
            width,
            height,
            size: data.byteLength,
          })),
        };
        return { image, picture };
      }),
    );

    const made = outcomes.flatMap((o) => (o.status === 'fulfilled' ? [o.value] : []));
    const errors = outcomes.flatMap((o) => (o.status === 'rejected' ? [o.reason as unknown] : []));
    const refused = errors.length > 0 && errors.every((e) => e instanceof ProviderRefusedError);
    if (!made.length && !refused && !delivery.last) throw errors[0]; // all transient: retry

    const usage = (outcome: 'ok' | 'failed', model: string, inputTokens = 0, outputTokens = 0) => ({
      jobId: event.jobId,
      requester: event.requester,
      siteId: event.siteId,
      task: 'image',
      provider: this.provider.name,
      model,
      outcome,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - started,
    });

    await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
      await tx.aiUsage.createMany({
        data: [
          ...made.map(({ picture }) =>
            usage('ok', picture.model, picture.inputTokens, picture.outputTokens),
          ),
          ...errors.map(() => usage('failed', 'n/a')),
        ],
      });
      if (made.length) {
        const completed: ImageGenerationCompletedEvent = {
          jobId: event.jobId,
          requester: event.requester,
          siteId: event.siteId,
          images: made.map((m) => m.image),
          provider: this.provider.name,
          model: made[0].picture.model,
        };
        await addToOutbox(tx, IMAGE_GENERATION_EVENTS.COMPLETED, completed);
      } else {
        const failed: ImageGenerationFailedEvent = {
          jobId: event.jobId,
          requester: event.requester,
          siteId: event.siteId,
          reason: refused ? 'provider_refused' : 'provider_unavailable',
          detail: describe(errors[0]).slice(0, 300),
        };
        await addToOutbox(tx, IMAGE_GENERATION_EVENTS.FAILED, failed);
      }
    });
    this.outbox.poke();
    this.logger.log(
      `job ${event.jobId}: ${made.length}/${event.targets.length} image(s) by ${this.provider.name} in ${Date.now() - started} ms` +
        (errors.length ? ` (failed: ${describe(errors[0])})` : ''),
    );
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
