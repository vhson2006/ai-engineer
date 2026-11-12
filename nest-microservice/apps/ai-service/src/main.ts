import './instrument'; // first: starts tracing before anything else is loaded
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AiServiceModule } from './ai-service.module';

/**
 * Event consumer + HTTP /health and /metrics only (ADR 0036). Requests come from the JetStream
 * stream EVENTS through a durable consumer with an inbox; results leave through the outbox.
 */
async function bootstrap() {
  const app = await NestFactory.create(AiServiceModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const config = app.get(ConfigService);

  app.enableShutdownHooks(); // stop consuming, flush the outbox, close the database on SIGTERM

  const healthPort = config.getOrThrow<number>('AI_HEALTH_PORT');
  await app.listen(healthPort);
  Logger.log(
    `Consuming AI requests (translation: ${config.get<string>('AI_TRANSLATION_PROVIDER')}); health on http://localhost:${healthPort}/health`,
    'AiService',
  );
}

void bootstrap();
