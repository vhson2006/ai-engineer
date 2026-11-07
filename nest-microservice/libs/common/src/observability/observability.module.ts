import {
  Controller,
  DynamicModule,
  Get,
  Header,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import * as Joi from 'joi';
import { register } from 'prom-client';
import { Public } from '../auth/auth.decorators';
import { initMetrics } from './metrics';
import { shutdownTracing } from './tracing';

/**
 * Optional observability env, validated by each service's Joi schema (`...OBSERVABILITY_ENV_SCHEMA`).
 * Tracing reads them from process.env before Nest starts (instrument.ts); Joi still rejects
 * invalid values at startup.
 */
export const OBSERVABILITY_ENV_SCHEMA = {
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
  OTEL_TRACES_SAMPLER_ARG: Joi.number().min(0).max(1).optional(),
  OTEL_RESOURCE_ATTRIBUTES: Joi.string().optional(),
  SERVICE_VERSION: Joi.string().optional(),
};

/**
 * Prometheus scrape endpoint for Grafana Alloy. Like /health: outside the `api` prefix, no token,
 * and NEVER published in KrakenD. Only route templates and counts, no user data.
 */
@Public()
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  metrics(): Promise<string> {
    return register.metrics();
  }
}

class TracingShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await shutdownTracing(); // flush the last spans before the process exits
  }
}

/**
 * Metrics (`GET /metrics`, Node.js process metrics, `service` label) and the tracing shutdown
 * hook. Import `ObservabilityModule.forRoot('<name>-service')` in the root module; REST services
 * also add `httpMetricsMiddleware` in `configureApp` and exclude `metrics` from the prefix.
 */
@Module({})
export class ObservabilityModule {
  static forRoot(service: string): DynamicModule {
    initMetrics(service);
    return {
      module: ObservabilityModule,
      controllers: [MetricsController],
      providers: [TracingShutdown],
    };
  }
}
