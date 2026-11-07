import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import {
  AuthModule,
  LOG_FORMATS,
  LOG_LEVELS,
  OBSERVABILITY_ENV_SCHEMA,
  ObservabilityModule,
  registerLogging,
  STORAGE_ENV_SCHEMA,
} from '@app/common';
import { DeploymentsModule } from './deployments/deployments.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

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
        DEPLOYMENT_PORT: Joi.number().port().default(3001),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        // Keycloak access tokens, verified locally with the realm's public keys (AuthModule).
        AUTH_ISSUER: Joi.string().uri().required(),
        AUTH_JWKS_URL: Joi.string().uri().required(),
        AUTH_AUDIENCE: Joi.string().required(),
        AUTH_ROLES_CLIENT: Joi.string().required(),
        // Object storage for uploaded files: S3 / DO Spaces / Cloudflare R2 / local S3 (libs/common/src/storage).
        ...STORAGE_ENV_SCHEMA,
        // Tracing (optional, ADR 0023): off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
        ...OBSERVABILITY_ENV_SCHEMA,
      }),
    }),
    // JSON logs + one access log line per request (requestId, userId, status, duration).
    registerLogging('deployment-service'),
    // GET /metrics for Grafana Alloy + flushing spans on shutdown (ADR 0023).
    ObservabilityModule.forRoot('deployment-service'),
    // Global AuthGuard: every route needs a valid token unless marked @Public().
    AuthModule,
    // Schema changes ONLY through Prisma Migrate (`npm run migration:run`), never at app startup.
    PrismaModule,
    // Background jobs (@Cron): FilesCleanupService.
    ScheduleModule.forRoot(),
    DeploymentsModule,
    FilesModule,
  ],
  controllers: [HealthController],
})
export class DeploymentServiceModule {}
