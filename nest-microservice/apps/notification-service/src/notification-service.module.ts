import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import {
  JetStreamModule,
  LOG_FORMATS,
  LOG_LEVELS,
  OBSERVABILITY_ENV_SCHEMA,
  ObservabilityModule,
  registerLogging,
} from '@app/common';
import { HealthController } from './health/health.controller';
import { NotificationsConsumer } from './notifications/notifications.consumer';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsService } from './notifications/notifications.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NATS_URL: Joi.string().uri().required(),
        // Logging (registerLogging): json for Loki, pretty for local reading.
        LOG_LEVEL: Joi.string()
          .valid(...LOG_LEVELS)
          .default('info'),
        LOG_FORMAT: Joi.string()
          .valid(...LOG_FORMATS)
          .default('json'),
        NOTIFICATION_HEALTH_PORT: Joi.number().port().default(3002),
        // Its own database (the inbox, ADR 0007).
        NOTIFICATION_DB_HOST: Joi.string().required(),
        NOTIFICATION_DB_PORT: Joi.number().port().default(5432),
        NOTIFICATION_DB_USER: Joi.string().required(),
        NOTIFICATION_DB_PASSWORD: Joi.string().allow('').required(),
        NOTIFICATION_DB_NAME: Joi.string().required(),
        // Tracing (optional, ADR 0023): off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
        ...OBSERVABILITY_ENV_SCHEMA,
      }),
    }),
    // JSON logs (same format as every service). Only /health and /metrics are HTTP; neither is access-logged.
    registerLogging('notification-service'),
    // GET /metrics (consumer counters, process metrics) + flushing spans on shutdown (ADR 0023).
    ObservabilityModule.forRoot('notification-service'),
    PrismaModule,
    // Events from the JetStream stream EVENTS (durable consumer + inbox), not core NATS.
    JetStreamModule.forRoot('notification-service'),
  ],
  controllers: [HealthController],
  providers: [NotificationsService, NotificationsConsumer],
})
export class NotificationServiceModule {}
