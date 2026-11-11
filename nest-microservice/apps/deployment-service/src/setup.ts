import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import {
  HttpAllExceptionsFilter,
  httpMetricsMiddleware,
  jsonBody,
  noStoreCache,
  requestContextMiddleware,
  requireJsonBody,
  validationExceptionFactory,
} from '@app/common';

/**
 * Global HTTP setup, shared by main.ts AND the integration tests, so tests run against
 * exactly the same pipeline as the running service.
 *
 * - Business routes live under /api (the same path KrakenD publishes, so Location headers
 *   are correct through the gateway). /health and /metrics stay at the root for probes and
 *   Grafana Alloy (never published in KrakenD).
 * - No CORS here: browsers never call the API. Only portfolio-web's server does, through KrakenD.
 */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger)); // every Nest Logger call goes through pino (JSON + requestId)
  // currentRequestId() for the whole request: HttpClient forwards it to upstreams as X-Request-Id.
  // No ETags at all (ADR 0029): Express would add a weak ETag to every body and answer 304 to
  // If-None-Match. Responses are `no-store` anyway.
  (app as NestExpressApplication).set('etag', false);
  app.use(httpMetricsMiddleware); // first: rejected requests (413, 415) are measured too
  app.use(requestContextMiddleware);
  app.use(noStoreCache); // authenticated responses: never stored by a shared cache
  app.use(requireJsonBody); // a body that isn't JSON → 415, not a confusing validation error
  app.use(...jsonBody()); // invalid JSON → 400 malformed_body (no parser internals), too big → 413
  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory, // 400 problem with `errors` per field
    }),
  );
  app.useGlobalFilters(new HttpAllExceptionsFilter());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('deployment-service')
      .setVersion('1.0')
      .addBearerAuth() // "Authorize" button: paste a Keycloak access token
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
