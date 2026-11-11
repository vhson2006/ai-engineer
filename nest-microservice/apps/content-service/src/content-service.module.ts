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
} from '@app/common';
import { ArticlesModule } from './articles/articles.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PublishedArticlesModule } from './published-articles/published-articles.module';
import { SitesModule } from './sites/sites.module';

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
        CONTENT_PORT: Joi.number().port().default(3003),
        // Its own database "content" (ADR 0026).
        CONTENT_DB_HOST: Joi.string().required(),
        CONTENT_DB_PORT: Joi.number().port().default(5432),
        CONTENT_DB_USER: Joi.string().required(),
        CONTENT_DB_PASSWORD: Joi.string().allow('').required(),
        CONTENT_DB_NAME: Joi.string().required(),
        // Keycloak access tokens for the content-api resource server (set from
        // CONTENT_AUTH_AUDIENCE by src/env.ts), verified locally with the realm's public keys.
        AUTH_ISSUER: Joi.string().uri().required(),
        AUTH_JWKS_URL: Joi.string().uri().required(),
        AUTH_AUDIENCE: Joi.string().required(),
        AUTH_ROLES_CLIENT: Joi.string().required(),
        // Tracing (optional, ADR 0023): off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
        ...OBSERVABILITY_ENV_SCHEMA,
      }),
    }),
    // JSON logs + one access log line per request (requestId, userId, status, duration).
    registerLogging('content-service'),
    // GET /metrics for Grafana Alloy + flushing spans on shutdown (ADR 0023).
    ObservabilityModule.forRoot('content-service'),
    // Global AuthGuard: every route needs a valid token unless marked @Public().
    AuthModule,
    // Schema changes ONLY through Prisma Migrate (`npm run migration:run`), never at app startup.
    PrismaModule,
    // Background jobs (@Cron): ArticleSchedulerService publishes scheduled articles every minute.
    ScheduleModule.forRoot(),
    // Features (ADR 0026): each one asks SitesModule for the site first (the site rule).
    SitesModule,
    CategoriesModule,
    ArticlesModule,
    PublishedArticlesModule,
  ],
  controllers: [HealthController],
})
export class ContentServiceModule {}
