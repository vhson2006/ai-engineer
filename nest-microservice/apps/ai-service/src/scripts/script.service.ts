import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  handleOnce,
  OutboxRelay,
  SCRIPT_WRITING_EVENTS,
  type ScriptWritingCompletedEvent,
  type ScriptWritingFailedEvent,
  type ScriptWritingRequestedEvent,
  type TranslationFailure,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { ProviderRefusedError } from '../translation/providers/translation-provider';
import { CONSUMER, type Delivery } from '../translation/translation.service';
import { SCRIPT_WRITER, type ScriptWriter } from './providers/script-writer';

/**
 * Writes one video script (ADR 0039), like TranslationService: the provider call runs outside any
 * transaction, then the result is written once (inbox id) with a usage row and the answer event.
 * Refusal → failed now; transient error → thrown (retried) until the last attempt → failed.
 */
@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(SCRIPT_WRITER) private readonly writer: ScriptWriter,
  ) {}

  async write(event: ScriptWritingRequestedEvent, delivery: Delivery): Promise<void> {
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
      task: 'script',
      provider: this.writer.name,
    };
    try {
      const script = await this.writer.write(event);
      const completed: ScriptWritingCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        hooks: script.hooks,
        scenes: script.scenes,
        caption: script.caption,
        hashtags: script.hashtags,
        provider: this.writer.name,
        model: script.model,
      };
      await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
        await tx.aiUsage.create({
          data: {
            ...usage,
            model: script.model,
            outcome: 'ok',
            inputTokens: script.inputTokens,
            outputTokens: script.outputTokens,
            durationMs: Date.now() - started,
          },
        });
        await addToOutbox(tx, SCRIPT_WRITING_EVENTS.COMPLETED, completed);
      });
      this.outbox.poke();
      this.logger.log(
        `job ${event.jobId}: script of ${event.scenes.length} scene(s) by ${this.writer.name} in ${Date.now() - started} ms`,
      );
    } catch (error) {
      const refused = error instanceof ProviderRefusedError;
      if (!refused && !delivery.last) throw error; // transient: JetStream retries
      const reason: TranslationFailure = refused ? error.reason : 'provider_unavailable';
      const failed: ScriptWritingFailedEvent = {
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
        await addToOutbox(tx, SCRIPT_WRITING_EVENTS.FAILED, failed);
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
