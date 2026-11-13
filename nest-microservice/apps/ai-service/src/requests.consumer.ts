import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import {
  FACT_SUGGESTION_EVENTS,
  FactSuggestionRequestedEvent,
  IMAGE_GENERATION_EVENTS,
  ImageGenerationRequestedEvent,
  JETSTREAM,
  JetStreamConsumer,
  PermanentMessageError,
  SCRIPT_WRITING_EVENTS,
  ScriptWritingRequestedEvent,
  SPEECH_EVENTS,
  SpeechRequestedEvent,
  TRANSLATION_EVENTS,
  TranslationRequestedEvent,
  type IncomingMessage,
  type JetStreamHandle,
  type MessageHandler,
} from '@app/common';
import { ImageService } from './images/image.service';
import { ScriptService } from './scripts/script.service';
import { SpeechService } from './speech/speech.service';
import { SuggestionService } from './suggestions/suggestion.service';
import { CONSUMER, type Delivery, TranslationService } from './translation/translation.service';

/** A model call can take a while: redeliver only after 3 minutes without an ack. */
const ACK_WAIT_MS = 180_000;
const MAX_DELIVER = 5;
const BACKOFF_MS = [15_000, 60_000, 300_000, 900_000];

/**
 * The ai-service's durable consumer on EVENTS (ADR 0007, 0036, 0037): translation and image
 * requests. An invalid payload goes to the DLQ (PermanentMessageError); every valid request is
 * answered with `completed` or `failed`, so a requester never waits forever.
 */
@Injectable()
export class RequestsConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private consumer?: JetStreamConsumer;

  constructor(
    @Inject(JETSTREAM) private readonly jetstream: JetStreamHandle,
    private readonly translations: TranslationService,
    private readonly images: ImageService,
    private readonly scripts: ScriptService,
    private readonly speech: SpeechService,
    private readonly suggestions: SuggestionService,
  ) {}

  /** Subject → handler. Exposed for tests. */
  readonly handlers: Record<string, MessageHandler> = {
    [TRANSLATION_EVENTS.REQUESTED]: this.validated(TranslationRequestedEvent, (event, delivery) =>
      this.translations.translate(event, delivery),
    ),
    [IMAGE_GENERATION_EVENTS.REQUESTED]: this.validated(
      ImageGenerationRequestedEvent,
      (event, delivery) => this.images.generate(event, delivery),
    ),
    // Video studio (ADR 0039).
    [SCRIPT_WRITING_EVENTS.REQUESTED]: this.validated(
      ScriptWritingRequestedEvent,
      (event, delivery) => this.scripts.write(event, delivery),
    ),
    [SPEECH_EVENTS.REQUESTED]: this.validated(SpeechRequestedEvent, (event, delivery) =>
      this.speech.speak(event, delivery),
    ),
    [FACT_SUGGESTION_EVENTS.REQUESTED]: this.validated(
      FactSuggestionRequestedEvent,
      (event, delivery) => this.suggestions.suggest(event, delivery),
    ),
  };

  async onApplicationBootstrap(): Promise<void> {
    this.consumer = new JetStreamConsumer(this.jetstream, {
      durable: CONSUMER,
      handlers: this.handlers,
      ackWaitMs: ACK_WAIT_MS,
      maxDeliver: MAX_DELIVER,
      backoffMs: BACKOFF_MS,
    });
    await this.consumer.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer?.stop();
  }

  private validated<T extends object>(
    type: ClassConstructor<T>,
    work: (event: T, delivery: Delivery) => Promise<void>,
  ): MessageHandler {
    return async (message: IncomingMessage) => {
      const event = plainToInstance(type, message.data);
      const errors = await validate(event);
      if (errors.length) {
        throw new PermanentMessageError(
          `invalid ${message.subject}: ${errors.map((e) => e.property).join(', ')}`,
        );
      }
      await work(event, {
        id: message.id,
        subject: message.subject,
        attempt: message.deliveryCount,
        last: message.deliveryCount >= MAX_DELIVER,
      });
    };
  }
}
