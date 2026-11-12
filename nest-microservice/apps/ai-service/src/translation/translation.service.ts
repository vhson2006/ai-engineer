import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  handleOnce,
  OutboxRelay,
  TRANSLATION_EVENTS,
  type TranslationCompletedEvent,
  type TranslationFailedEvent,
  type TranslationFailure,
  type TranslationRequestedEvent,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  ProviderRefusedError,
  TRANSLATION_PROVIDER,
  type TranslationProvider,
} from './providers/translation-provider';

/** Durable consumer name, also the inbox `consumer` column. */
export const CONSUMER = 'ai';

export interface Delivery {
  id: string;
  subject: string;
  /** This is the last delivery JetStream will make: answer `failed` instead of throwing. */
  last: boolean;
  attempt: number;
}

/**
 * Translates one request (ADR 0036). The provider call runs OUTSIDE any transaction (it can take
 * tens of seconds); the result is then written once, with the inbox id, as an outbox event:
 *
 *   success                       → usage row + events.translation.completed
 *   ProviderRefusedError          → usage row + events.translation.failed (no retry)
 *   other error, not last attempt → thrown: JetStream redelivers with backoff
 *   other error, last attempt     → usage row + events.translation.failed (provider_unavailable)
 *
 * A duplicate delivery finds its id in the inbox and stops before calling the provider; two
 * replicas racing on the same message may both call it, only one result is written.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(TRANSLATION_PROVIDER) private readonly provider: TranslationProvider,
  ) {}

  async translate(event: TranslationRequestedEvent, delivery: Delivery): Promise<void> {
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
      task: 'translation',
      provider: this.provider.name,
    };
    try {
      const result = await this.provider.translate({
        sourceLocale: event.sourceLocale,
        targetLocale: event.targetLocale,
        kind: event.kind,
        segments: event.segments,
        glossary: event.glossary ?? [],
      });
      const completed: TranslationCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        targetLocale: event.targetLocale,
        segments: result.segments,
        provider: this.provider.name,
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
        await addToOutbox(tx, TRANSLATION_EVENTS.COMPLETED, completed);
      });
      this.outbox.poke();
      this.logger.log(
        `job ${event.jobId}: ${event.segments.length} segment(s) ${event.sourceLocale}→${event.targetLocale} by ${this.provider.name} in ${Date.now() - started} ms`,
      );
    } catch (error) {
      const refused = error instanceof ProviderRefusedError;
      if (!refused && !delivery.last) throw error; // transient: JetStream retries
      const reason: TranslationFailure = refused ? error.reason : 'provider_unavailable';
      const failed: TranslationFailedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        reason,
        detail: describe(error).slice(0, 300),
        attempts: delivery.attempt,
      };
      await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
        await tx.aiUsage.create({
          data: { ...usage, model: 'n/a', outcome: 'failed', durationMs: Date.now() - started },
        });
        await addToOutbox(tx, TRANSLATION_EVENTS.FAILED, failed);
      });
      this.outbox.poke();
      this.logger.warn(`job ${event.jobId} failed (${reason}): ${failed.detail}`);
    }
  }
}

/** Name and message only: never an error object (it could carry request details). */
function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
