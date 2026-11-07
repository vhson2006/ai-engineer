import './instrument'; // first: starts tracing before anything else is loaded
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { NotificationServiceModule } from './notification-service.module';

/**
 * Event consumer + HTTP /health and /metrics only. Events come from the JetStream stream EVENTS through a
 * durable consumer with an inbox (NotificationsConsumer, ADR 0007): at-least-once delivery, each
 * event processed once. Replicas share the durable consumer (each message goes to one of them).
 */
async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger)); // JSON logs through pino
  const config = app.get(ConfigService);

  app.enableShutdownHooks(); // stop consuming, drain NATS, close the database on SIGTERM

  const healthPort = config.getOrThrow<number>('NOTIFICATION_HEALTH_PORT');
  await app.listen(healthPort);
  Logger.log(
    `Consuming events from JetStream; health on http://localhost:${healthPort}/health`,
    'NotificationService',
  );
}

void bootstrap();
