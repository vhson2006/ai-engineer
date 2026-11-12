import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import {
  LOG_FORMATS,
  LOG_LEVELS,
  OBSERVABILITY_ENV_SCHEMA,
  ObservabilityModule,
  registerLogging,
  STORAGE_ENV_SCHEMA,
} from '@app/common';
import { HealthController } from './health/health.controller';
import { ImagesModule } from './images/images.module';
import { OutboxModule } from './messaging/outbox.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestsConsumer } from './requests.consumer';
import { TranslationModule } from './translation/translation.module';

/**
 * ai-service (ADR 0036): the ONLY service that talks to AI providers and holds their keys.
 * Event consumer + outbox; HTTP only for /health and /metrics (never published by KrakenD).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NATS_URL: Joi.string().uri().required(),
        LOG_LEVEL: Joi.string()
          .valid(...LOG_LEVELS)
          .default('info'),
        LOG_FORMAT: Joi.string()
          .valid(...LOG_FORMATS)
          .default('json'),
        AI_HEALTH_PORT: Joi.number().port().default(3004),
        // Its own database "ai": inbox, outbox, usage ledger.
        AI_DB_HOST: Joi.string().required(),
        AI_DB_PORT: Joi.number().port().default(5432),
        AI_DB_USER: Joi.string().required(),
        AI_DB_PASSWORD: Joi.string().allow('').required(),
        AI_DB_NAME: Joi.string().required(),
        // Which translation backend: fake (no network, tests) or gemini (GEMINI_API_KEY).
        AI_TRANSLATION_PROVIDER: Joi.string().valid('fake', 'gemini').required(),
        GEMINI_API_KEY: Joi.string().when('AI_TRANSLATION_PROVIDER', {
          is: 'gemini',
          then: Joi.required(),
          otherwise: Joi.when('AI_IMAGE_PROVIDER', { is: 'gemini', then: Joi.required() }),
        }),
        AI_GEMINI_MODEL: Joi.string().default('gemini-3.8-flash'),
        // Images (ADR 0037): fake (a local picture) or gemini (paid, no free tier).
        AI_IMAGE_PROVIDER: Joi.string().valid('fake', 'gemini').default('fake'),
        AI_GEMINI_IMAGE_MODEL: Joi.string().default('gemini-3.1-flash-lite-image'),
        // The public bucket the generated images are written to (the requester's media keys).
        ...STORAGE_ENV_SCHEMA,
        // One provider call (the SDK may retry once): well under the consumer's 3 min ack wait.
        AI_PROVIDER_TIMEOUT_MS: Joi.number().integer().min(10_000).max(80_000).default(60_000),
        // Tracing (optional, ADR 0023): off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
        ...OBSERVABILITY_ENV_SCHEMA,
      }),
    }),
    registerLogging('ai-service'),
    ObservabilityModule.forRoot('ai-service'),
    PrismaModule,
    OutboxModule,
    TranslationModule,
    ImagesModule,
  ],
  controllers: [HealthController],
  providers: [RequestsConsumer],
})
export class AiServiceModule {}
