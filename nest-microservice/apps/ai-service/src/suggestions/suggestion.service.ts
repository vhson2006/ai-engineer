import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  FACT_SUGGESTION_EVENTS,
  handleOnce,
  OBJECT_STORAGE,
  OutboxRelay,
  type FactSuggestionCompletedEvent,
  type FactSuggestionFailedEvent,
  type FactSuggestionRequestedEvent,
  type ObjectStorage,
  type TranslationFailure,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { ProviderRefusedError } from '../translation/providers/translation-provider';
import { CONSUMER, type Delivery } from '../translation/translation.service';
import { FACT_SUGGESTER, type FactSuggester, type LoadedImage } from './providers/fact-suggester';

const IMAGE_TIMEOUT_MS = 10_000;
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg' };

/**
 * Drafts a video project's descriptive fields (ADR 0039, "Suggest with AI"), like ScriptService:
 * the provider call runs outside any transaction, then the result is written once (inbox id) with
 * a usage row and the answer event. Images are read from the site's own media library only
 * (keys checked against the request's site; the URL is the storage's public one, never one
 * from the event: no SSRF).
 */
@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(FACT_SUGGESTER) private readonly suggester: FactSuggester,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async suggest(event: FactSuggestionRequestedEvent, delivery: Delivery): Promise<void> {
    const seen = await this.prisma.inboxMessage.findUnique({
      where: { consumer_messageId: { consumer: CONSUMER, messageId: delivery.id } },
      select: { messageId: true },
    });
    if (seen) return;

    const started = Date.now();
    const usage = {
      jobId: event.jobId,
      requester: event.requester,
      siteId: event.siteId,
      task: 'suggestion',
      provider: this.suggester.name,
    };
    try {
      const images = await this.loadImages(event);
      const result = await this.suggester.suggest(event, images);
      const completed: FactSuggestionCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        facts: result.facts,
        provider: this.suggester.name,
        model: result.model,
      };
      await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
        await tx.aiUsage.create({
          data: {
            ...usage,
            model: result.model,
            outcome: 'ok',
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            durationMs: Date.now() - started,
          },
        });
        await addToOutbox(tx, FACT_SUGGESTION_EVENTS.COMPLETED, completed);
      });
      this.outbox.poke();
      this.logger.log(
        `job ${event.jobId}: ${result.facts.length}/${event.fields.length} field(s) by ${this.suggester.name} in ${Date.now() - started} ms`,
      );
    } catch (error) {
      const refused = error instanceof ProviderRefusedError;
      if (!refused && !delivery.last) throw error; // transient: JetStream retries
      const reason: TranslationFailure = refused ? error.reason : 'provider_unavailable';
      const failed: FactSuggestionFailedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        reason,
        detail: describe(error).slice(0, 300),
      };
      await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
        await tx.aiUsage.create({
          data: { ...usage, model: 'n/a', outcome: 'failed', durationMs: Date.now() - started },
        });
        await addToOutbox(tx, FACT_SUGGESTION_EVENTS.FAILED, failed);
      });
      this.outbox.poke();
      this.logger.warn(`job ${event.jobId} failed (${reason}): ${failed.detail}`);
    }
  }

  /** The fields' images, in order: only the request site's media (refused otherwise). */
  private async loadImages(event: FactSuggestionRequestedEvent): Promise<LoadedImage[]> {
    const keys = event.fields.flatMap((field) => field.images ?? []);
    const prefix = `media/${event.siteId}/`;
    if (keys.some((key) => !key.startsWith(prefix))) {
      throw new ProviderRefusedError('An image is not one of the site’s');
    }
    const loaded: LoadedImage[] = [];
    for (const key of keys) {
      // A binary GET of our own CDN (HttpClient speaks JSON): no redirect, a timeout, a size cap.
      const response = await fetch(this.storage.publicUrl(key), {
        redirect: 'error',
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });
      if (response.status === 404) throw new ProviderRefusedError(`Image ${key} not found`);
      if (!response.ok) throw new Error(`Image ${key}: HTTP ${response.status}`); // transient
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > IMAGE_MAX_BYTES) {
        throw new ProviderRefusedError(`Image ${key} is too big`);
      }
      const extension = key.slice(key.lastIndexOf('.') + 1);
      loaded.push({
        key,
        mimeType: IMAGE_TYPES[extension] ?? 'image/webp',
        data: bytes.toString('base64'),
      });
    }
    return loaded;
  }
}

/** Name and message only: never an error object (it could carry request details). */
function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
