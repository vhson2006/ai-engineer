import type { IncomingMessage } from 'node:http';
import {
  context,
  propagation,
  type Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation, ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import {
  defaultResource,
  detectResources,
  envDetector,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { pathOf, UNMEASURED_PATHS } from './paths';

/**
 * Distributed tracing with OpenTelemetry (ADR 0023). Spans go over OTLP/HTTP to Grafana Alloy in
 * the cluster, which forwards them to Grafana Cloud (Tempo). The W3C `traceparent` header sent by
 * KrakenD / the web apps continues the same trace here.
 *
 * Call `startTracing('<name>-service')` in `src/instrument.ts`, imported FIRST in main.ts: the
 * instrumentations patch http, express, pg and pino when they are first required. Import it from
 * '@app/common/observability/tracing', never from the '@app/common' barrel (which loads pino).
 * Keep this file's imports free of pino/express/pg for the same reason.
 *
 * Off unless OTEL_EXPORTER_OTLP_ENDPOINT (or OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) is set, so local
 * dev and tests need nothing. Env (OBSERVABILITY_ENV_SCHEMA): OTEL_EXPORTER_OTLP_ENDPOINT,
 * OTEL_TRACES_SAMPLER_ARG (0..1, share of NEW traces kept; default 1), OTEL_RESOURCE_ATTRIBUTES
 * (e.g. deployment.environment.name=prod), SERVICE_VERSION (image tag).
 * Logs written inside a span carry `trace_id` / `span_id` (pino instrumentation).
 */

let provider: TracerProvider | undefined;

export function isTracingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.OTEL_SDK_DISABLED === 'true') return false;
  return Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
}

/** Share of new (root) traces to keep; a sampled parent (KrakenD, web app) is always followed. */
export function samplerRatio(value: string | undefined): number {
  const ratio = value === undefined || value === '' ? 1 : Number(value);
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 1;
}

/** Starts tracing for this process. Returns false (and does nothing) when it's not configured. */
export function startTracing(service: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (provider) return true;
  if (!isTracingEnabled(env)) return false;

  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  );

  provider = new TracerProvider({
    resource: defaultResource()
      .merge(
        resourceFromAttributes({
          [ATTR_SERVICE_NAME]: service,
          ...(env.SERVICE_VERSION ? { [ATTR_SERVICE_VERSION]: env.SERVICE_VERSION } : {}),
        }),
      )
      .merge(detectResources({ detectors: [envDetector] })), // OTEL_RESOURCE_ATTRIBUTES
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(samplerRatio(env.OTEL_TRACES_SAMPLER_ARG)),
    }),
    spanProcessors: [new BatchSpanProcessor({ exporter: new OTLPTraceExporter() })],
  });
  trace.setGlobalTracerProvider(provider);

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new HttpInstrumentation({
        // Probes and scrapes: thousands of useless traces a day.
        ignoreIncomingRequestHook: (req: IncomingMessage) => UNMEASURED_PATHS.has(pathOf(req.url)),
      }),
      // Route spans only; one span per Express middleware is noise.
      new ExpressInstrumentation({ ignoreLayersType: [ExpressLayerType.MIDDLEWARE] }),
      new NestInstrumentation(),
      // Only queries inside a traced request/message: the outbox poll (every second) isn't traced.
      new PgInstrumentation({ requireParentSpan: true }),
      // trace_id/span_id in our JSON logs; the logs themselves still go to stdout → Alloy → Loki.
      new PinoInstrumentation({ disableLogSending: true }),
    ],
  });
  return true;
}

/** Flushes pending spans. Called on application shutdown (ObservabilityModule). */
export async function shutdownTracing(): Promise<void> {
  const current = provider;
  provider = undefined;
  await current?.shutdown();
}

/**
 * Runs `work` inside a CONSUMER span for one message delivery (a new trace: events cross the
 * outbox, so the producer's request trace is not continued). No-op when tracing is off.
 */
export function withConsumerSpan<T>(
  consumer: string,
  subject: string,
  messageId: string,
  work: (span: Span) => Promise<T>,
): Promise<T> {
  return trace.getTracer('@app/common/messaging').startActiveSpan(
    `process ${subject}`,
    {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'nats',
        'messaging.operation.type': 'process',
        'messaging.destination.name': subject,
        'messaging.consumer.group.name': consumer,
        'messaging.message.id': messageId,
      },
    },
    async (span) => {
      try {
        return await work(span);
      } catch (error) {
        span.recordException(error instanceof Error ? error : String(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
