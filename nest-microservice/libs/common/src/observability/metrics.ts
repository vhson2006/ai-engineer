import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';
import { pathOf, UNMEASURED_PATHS } from './paths';

/**
 * Prometheus metrics (ADR 0023), served on GET /metrics (MetricsController) and scraped by
 * Grafana Alloy in the cluster. Every metric lives in prom-client's default registry.
 *
 * Labels must stay LOW-CARDINALITY (Grafana Cloud bills active series): route TEMPLATES
 * (`/api/deployments/:id`), never raw paths, ids, user ids or query strings.
 */

const KNOWN_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

let initialized = false;

/** Node.js process metrics (CPU, memory, event loop lag, GC) + `service` label. Idempotent. */
export function initMetrics(service: string): void {
  if (initialized) return;
  initialized = true;
  register.setDefaultLabels({ service });
  collectDefaultMetrics({ register });
}

export const httpRequestDuration = new Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'Duration of HTTP requests handled by this service, by route template and status.',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Few buckets: every bucket is one more series per route × method × status.
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

/** Route template of the matched handler, e.g. `/api/deployments/:id`; `unmatched` otherwise. */
export function routeOf(req: Pick<Request, 'baseUrl' | 'route'>): string {
  const route: unknown = (req.route as { path?: unknown } | undefined)?.path;
  return typeof route === 'string' ? `${req.baseUrl ?? ''}${route}` : 'unmatched';
}

/**
 * Express middleware: one observation per request in `http_server_request_duration_seconds`.
 * Register it FIRST in `configureApp` so rejected requests (413, 415) are measured too.
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (UNMEASURED_PATHS.has(pathOf(req.originalUrl ?? req.url))) return next();
  const end = httpRequestDuration.startTimer();
  let done = false;
  const record = () => {
    if (done) return;
    done = true;
    end({
      method: KNOWN_METHODS.has(req.method) ? req.method : 'OTHER',
      route: routeOf(req),
      // Client went away before the response was sent: not a status the service chose.
      status_code: res.writableFinished ? String(res.statusCode) : 'aborted',
    });
  };
  res.once('finish', record);
  res.once('close', record);
  next();
}

// ---- messaging (ADR 0007): outbox relay and JetStream consumers ----------------------------------

export const outboxPublished = new Counter({
  name: 'messaging_outbox_published_total',
  help: 'Outbox rows published to JetStream (PubAck received).',
  labelNames: ['subject'] as const,
});

export const outboxPublishFailures = new Counter({
  name: 'messaging_outbox_publish_failures_total',
  help: 'Failed attempts to publish an outbox row (retried at the next poll).',
  labelNames: ['subject'] as const,
});

export const consumerMessages = new Counter({
  name: 'messaging_consumer_messages_total',
  help: 'Messages handled by a durable consumer, by outcome: ack, retry (nak) or dlq.',
  labelNames: ['consumer', 'subject', 'outcome'] as const,
});

export const consumerDuration = new Histogram({
  name: 'messaging_consumer_duration_seconds',
  help: 'Time spent handling one delivery of a message (whatever the outcome).',
  labelNames: ['consumer', 'subject'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 30],
});
