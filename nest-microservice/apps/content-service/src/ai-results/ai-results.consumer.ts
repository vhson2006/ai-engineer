import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import {
  handleOnce,
  FACT_SUGGESTION_EVENTS,
  FactSuggestionCompletedEvent,
  FactSuggestionFailedEvent,
  IMAGE_GENERATION_EVENTS,
  ImageGenerationCompletedEvent,
  ImageGenerationFailedEvent,
  JETSTREAM,
  JetStreamConsumer,
  PermanentMessageError,
  SCRIPT_WRITING_EVENTS,
  ScriptWritingCompletedEvent,
  ScriptWritingFailedEvent,
  SPEECH_EVENTS,
  SpeechCompletedEvent,
  SpeechFailedEvent,
  VIDEO_RENDER_EVENTS,
  VideoRenderCompletedEvent,
  VideoRenderFailedEvent,
  TRANSLATION_EVENTS,
  TranslationCompletedEvent,
  TranslationFailedEvent,
  type IncomingMessage,
  type JetStreamHandle,
  type MessageHandler,
} from '@app/common';
import type { Prisma } from '../generated/prisma/client';
import { REQUESTER } from '../common/ai';
import { MediaGenerationService } from '../media/media-generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../studio/projects.service';
import { TranslationJobsService } from '../translations/translation-jobs.service';

/** Durable consumer name, also the inbox `consumer` column. */
export const CONSUMER = 'content';

/**
 * content-service's durable consumer on EVENTS (ADR 0007, 0036, 0037): what ai-service answers to
 * its translation and image requests. Each answer is applied ONCE (inbox, same transaction as
 * its effect); answers for another requester are acked and ignored.
 */
@Injectable()
export class AiResultsConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AiResultsConsumer.name);
  private consumer?: JetStreamConsumer;

  constructor(
    @Inject(JETSTREAM) private readonly jetstream: JetStreamHandle,
    private readonly prisma: PrismaService,
    private readonly jobs: TranslationJobsService,
    private readonly images: MediaGenerationService,
    private readonly studio: ProjectsService,
  ) {}

  /** Subject → handler. Exposed for tests. */
  readonly handlers: Record<string, MessageHandler> = {
    [TRANSLATION_EVENTS.COMPLETED]: this.once(TranslationCompletedEvent, (tx, event) =>
      this.jobs.complete(tx, event),
    ),
    [TRANSLATION_EVENTS.FAILED]: this.once(TranslationFailedEvent, (tx, event) =>
      this.jobs.fail(tx, event),
    ),
    [IMAGE_GENERATION_EVENTS.COMPLETED]: this.once(ImageGenerationCompletedEvent, (tx, event) =>
      this.images.complete(tx, event),
    ),
    [IMAGE_GENERATION_EVENTS.FAILED]: this.once(ImageGenerationFailedEvent, (tx, event) =>
      this.images.fail(tx, event),
    ),
    // Video studio (ADR 0039): script and voice from ai-service, the MP4 from render-worker.
    [FACT_SUGGESTION_EVENTS.COMPLETED]: this.once(FactSuggestionCompletedEvent, (tx, event) =>
      this.studio.suggestionWritten(tx, event),
    ),
    [FACT_SUGGESTION_EVENTS.FAILED]: this.once(FactSuggestionFailedEvent, (tx, event) =>
      this.studio.suggestionFailed(tx, event),
    ),
    [SCRIPT_WRITING_EVENTS.COMPLETED]: this.once(ScriptWritingCompletedEvent, (tx, event) =>
      this.studio.scriptWritten(tx, event),
    ),
    [SCRIPT_WRITING_EVENTS.FAILED]: this.once(ScriptWritingFailedEvent, (tx, event) =>
      this.studio.scriptFailed(tx, event),
    ),
    [SPEECH_EVENTS.COMPLETED]: this.once(SpeechCompletedEvent, (tx, event) =>
      this.studio.voiceReady(tx, event),
    ),
    [SPEECH_EVENTS.FAILED]: this.once(SpeechFailedEvent, (tx, event) =>
      this.studio.voiceFailed(tx, event),
    ),
    // render-worker serves only us: its answers have no `requester`.
    [VIDEO_RENDER_EVENTS.COMPLETED]: this.once(VideoRenderCompletedEvent, (tx, event) =>
      this.studio.rendered(tx, event),
    ),
    [VIDEO_RENDER_EVENTS.FAILED]: this.once(VideoRenderFailedEvent, (tx, event) =>
      this.studio.renderFailed(tx, event),
    ),
  };

  async onApplicationBootstrap(): Promise<void> {
    this.consumer = new JetStreamConsumer(this.jetstream, {
      durable: CONSUMER,
      handlers: this.handlers,
    });
    await this.consumer.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer?.stop();
  }

  private once<T extends object>(
    type: ClassConstructor<T>,
    work: (tx: Prisma.TransactionClient, event: T) => Promise<void>,
  ): MessageHandler {
    return async (message: IncomingMessage) => {
      const event = plainToInstance(type, message.data);
      const errors = await validate(event);
      if (errors.length) {
        throw new PermanentMessageError(
          `invalid ${message.subject}: ${errors.map((e) => e.property).join(', ')}`,
        );
      }
      const requester = (event as { requester?: unknown }).requester;
      if (requester !== undefined && requester !== REQUESTER) return; // another service's job
      const processed = await handleOnce(this.prisma, CONSUMER, message.id, message.subject, (tx) =>
        work(tx, event),
      );
      if (!processed)
        this.logger.log(`${message.subject} ${message.id} already processed: skipped`);
    };
  }
}
