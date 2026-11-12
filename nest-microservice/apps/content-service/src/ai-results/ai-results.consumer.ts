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
  IMAGE_GENERATION_EVENTS,
  ImageGenerationCompletedEvent,
  ImageGenerationFailedEvent,
  JETSTREAM,
  JetStreamConsumer,
  PermanentMessageError,
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

  private once<T extends { requester: string }>(
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
      if (event.requester !== REQUESTER) return; // another service's job
      const processed = await handleOnce(this.prisma, CONSUMER, message.id, message.subject, (tx) =>
        work(tx, event),
      );
      if (!processed)
        this.logger.log(`${message.subject} ${message.id} already processed: skipped`);
    };
  }
}
