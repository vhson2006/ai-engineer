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
  DEPLOYMENT_EVENTS,
  DeploymentCreatedEvent,
  DeploymentStatusChangedEvent,
  handleOnce,
  JETSTREAM,
  JetStreamConsumer,
  PermanentMessageError,
  type IncomingMessage,
  type JetStreamHandle,
  type MessageHandler,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';

/** Durable consumer name, also the inbox `consumer` column. */
export const CONSUMER = 'notification';

/**
 * Event consumer (ADR 0007): a durable JetStream consumer on the EVENTS stream. Each event is
 * validated, then processed ONCE through the inbox (handleOnce: id recorded in the same
 * transaction). Errors → nak and redelivery with backoff; invalid payloads → DLQ.
 */
@Injectable()
export class NotificationsConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private consumer?: JetStreamConsumer;

  constructor(
    @Inject(JETSTREAM) private readonly jetstream: JetStreamHandle,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Subject → handler. Exposed for tests. */
  readonly handlers: Record<string, MessageHandler> = {
    [DEPLOYMENT_EVENTS.CREATED]: this.once(DeploymentCreatedEvent, (event) =>
      this.notifications.deploymentCreated(event),
    ),
    [DEPLOYMENT_EVENTS.STATUS_CHANGED]: this.once(DeploymentStatusChangedEvent, (event) =>
      this.notifications.statusChanged(event),
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

  /** Validates the payload, then runs `work` once per message id (inbox). */
  private once<T extends object>(
    type: ClassConstructor<T>,
    work: (event: T) => Promise<void>,
  ): MessageHandler {
    return async (message: IncomingMessage) => {
      const event = plainToInstance(type, message.data);
      const errors = await validate(event);
      if (errors.length) {
        throw new PermanentMessageError(
          `invalid ${message.subject}: ${errors.map((e) => e.property).join(', ')}`,
        );
      }
      const processed = await handleOnce(this.prisma, CONSUMER, message.id, message.subject, () =>
        work(event),
      );
      if (!processed)
        this.logger.log(`${message.subject} ${message.id} already processed: skipped (duplicate)`);
    };
  }
}
