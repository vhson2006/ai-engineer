import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  ARTICLE_PROMPT_EVENTS,
  ARTICLE_WRITING_EVENTS,
  handleOnce,
  OutboxRelay,
  type ArticleJobFailedEvent,
  type ArticlePromptCompletedEvent,
  type ArticlePromptRequestedEvent,
  type ArticleWritingCompletedEvent,
  type ArticleWritingRequestedEvent,
  type TranslationFailure,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { ProviderRefusedError } from '../translation/providers/translation-provider';
import { CONSUMER, type Delivery } from '../translation/translation.service';
import { ARTICLE_AUTHOR, type ArticleAuthor } from './providers/article-author';

type Events = typeof ARTICLE_PROMPT_EVENTS | typeof ARTICLE_WRITING_EVENTS;

/**
 * The two steps of an AI article (ADR 0041), like ScriptService: the provider call runs outside
 * any transaction, then the result is written once (inbox id) with a usage row and the answer.
 * Refusal → failed now; transient error → thrown (retried) until the last attempt → failed.
 */
@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(ARTICLE_AUTHOR) private readonly author: ArticleAuthor,
  ) {}

  brief(event: ArticlePromptRequestedEvent, delivery: Delivery): Promise<void> {
    return this.run(event, delivery, 'article-brief', ARTICLE_PROMPT_EVENTS, async () => {
      const brief = await this.author.brief(event);
      const answer: ArticlePromptCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        prompt: brief.prompt,
        outline: brief.outline,
        provider: this.author.name,
        model: brief.model,
      };
      return { answer, usage: brief };
    });
  }

  write(event: ArticleWritingRequestedEvent, delivery: Delivery): Promise<void> {
    return this.run(event, delivery, 'article', ARTICLE_WRITING_EVENTS, async () => {
      const draft = await this.author.write(event);
      const answer: ArticleWritingCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        article: draft.article,
        provider: this.author.name,
        model: draft.model,
      };
      return { answer, usage: draft };
    });
  }

  private async run(
    event: { jobId: string; requester: string; siteId: string },
    delivery: Delivery,
    task: string,
    subjects: Events,
    work: () => Promise<{
      answer: object;
      usage: { model: string; inputTokens: number; outputTokens: number };
    }>,
  ): Promise<void> {
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
      task,
      provider: this.author.name,
    };
    try {
      const { answer, usage: used } = await work();
      await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
        await tx.aiUsage.create({
          data: {
            ...usage,
            model: used.model,
            outcome: 'ok',
            inputTokens: used.inputTokens,
            outputTokens: used.outputTokens,
            durationMs: Date.now() - started,
          },
        });
        await addToOutbox(tx, subjects.COMPLETED, answer);
      });
      this.outbox.poke();
      this.logger.log(
        `job ${event.jobId}: ${task} by ${this.author.name} in ${Date.now() - started} ms`,
      );
    } catch (error) {
      const refused = error instanceof ProviderRefusedError;
      if (!refused && !delivery.last) throw error; // transient: JetStream retries
      const reason: TranslationFailure = refused ? error.reason : 'provider_unavailable';
      const failed: ArticleJobFailedEvent = {
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
        await addToOutbox(tx, subjects.FAILED, failed);
      });
      this.outbox.poke();
      this.logger.warn(`job ${event.jobId} ${task} failed (${reason}): ${failed.detail}`);
    }
  }
}

/** Name and message only: never an error object (it could carry request details). */
function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
