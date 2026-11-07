import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { register } from 'prom-client';
import { httpMetricsMiddleware, httpRequestDuration, routeOf } from './metrics';
import { isTracingEnabled, samplerRatio, startTracing } from './tracing';

describe('[observability] metrics', () => {
  beforeEach(() => httpRequestDuration.reset());

  it('routeOf uses the route TEMPLATE, never the raw path (low cardinality)', () => {
    expect(routeOf({ baseUrl: '', route: { path: '/api/deployments/:id' } } as Request)).toBe(
      '/api/deployments/:id',
    );
    expect(routeOf({ baseUrl: '/api', route: { path: '/files' } } as Request)).toBe('/api/files');
    expect(routeOf({ baseUrl: '', route: undefined } as Request)).toBe('unmatched');
  });

  function fakeRequest(overrides: Partial<Request>) {
    const res = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: true });
    const req = { method: 'GET', url: '/', originalUrl: '/', baseUrl: '', ...overrides };
    const next = jest.fn() as NextFunction;
    httpMetricsMiddleware(req as Request, res as unknown as Response, next);
    return { req, res, next };
  }

  async function observations() {
    const metric = await httpRequestDuration.get();
    return metric.values
      .filter((v) => v.metricName === 'http_server_request_duration_seconds_count')
      .map((v) => ({ ...v.labels, count: v.value }));
  }

  it('records one observation per request, once, with method / route / status', async () => {
    const { req, res, next } = fakeRequest({
      method: 'GET',
      originalUrl: '/api/deployments/8f14e45f?x=secret',
    });
    expect(next).toHaveBeenCalled();
    (req as { route?: unknown }).route = { path: '/api/deployments/:id' }; // set by the router
    res.statusCode = 404;
    res.emit('finish');
    res.emit('close'); // fired after finish: not counted twice

    expect(await observations()).toEqual([
      { method: 'GET', route: '/api/deployments/:id', status_code: '404', count: 1 },
    ]);
  });

  it('client aborted before the response → status "aborted"; odd methods → "OTHER"', async () => {
    const { res } = fakeRequest({ method: 'PROPFIND' });
    res.writableFinished = false;
    res.emit('close');

    expect(await observations()).toEqual([
      { method: 'OTHER', route: 'unmatched', status_code: 'aborted', count: 1 },
    ]);
  });

  it('does not measure /health and /metrics (probes, scrapes)', async () => {
    for (const path of ['/health', '/metrics', '/metrics?x=1']) {
      const { res, next } = fakeRequest({ originalUrl: path });
      res.emit('finish');
      expect(next).toHaveBeenCalled();
    }
    expect(await observations()).toEqual([]);
  });

  it('every metric uses the shared registry served on /metrics', async () => {
    const text = await register.metrics();
    for (const name of [
      'http_server_request_duration_seconds',
      'messaging_outbox_published_total',
      'messaging_outbox_publish_failures_total',
      'messaging_consumer_messages_total',
      'messaging_consumer_duration_seconds',
    ]) {
      expect(text).toContain(`# TYPE ${name} `);
    }
  });
});

describe('[observability] tracing', () => {
  it('is off unless an OTLP endpoint is configured (dev and tests need nothing)', () => {
    expect(isTracingEnabled({})).toBe(false);
    expect(isTracingEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy:4318' })).toBe(true);
    expect(isTracingEnabled({ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://alloy:4318' })).toBe(
      true,
    );
    expect(
      isTracingEnabled({
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy:4318',
        OTEL_SDK_DISABLED: 'true',
      }),
    ).toBe(false);
    expect(startTracing('test-service', {})).toBe(false);
  });

  it('samplerRatio: default 1, clamped to [0, 1], garbage → 1', () => {
    expect(samplerRatio(undefined)).toBe(1);
    expect(samplerRatio('')).toBe(1);
    expect(samplerRatio('0.25')).toBe(0.25);
    expect(samplerRatio('0')).toBe(0);
    expect(samplerRatio('7')).toBe(1);
    expect(samplerRatio('-1')).toBe(0);
    expect(samplerRatio('abc')).toBe(1);
  });
});
