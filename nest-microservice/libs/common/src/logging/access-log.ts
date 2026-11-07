import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { hostname } from 'node:os';
import { LevelWithSilent, stdSerializers, stdTimeFunctions } from 'pino';
import { Options } from 'pino-http';
import { AuthUser } from '../auth/auth.types';
import { pathOf, UNMEASURED_PATHS } from '../observability/paths';

export { pathOf };

/** Correlation id header: read from the caller (Next.js, KrakenD) or generated, and echoed back. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Accept a caller's id only if it's short and boring, so it can't pollute the logs. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export const LOG_FORMATS = ['json', 'pretty'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

export interface AccessLogConfig {
  /** Becomes the `service` field of every line (a Loki label later). */
  service: string;
  level: LevelWithSilent;
  /** `json` (default, one object per line, for Loki) or `pretty` (local dev, needs pino-pretty). */
  format: LogFormat;
}

// `id` is already declared on IncomingMessage by pino-http.
type Req = IncomingMessage & { originalUrl?: string; user?: AuthUser };

/** The caller's X-Request-Id when it's safe, otherwise a new UUID. */
export function requestIdFrom(header: string | string[] | undefined): string {
  return typeof header === 'string' && SAFE_REQUEST_ID.test(header) ? header : randomUUID();
}

/**
 * pino-http options shared by every service. One JSON line per request:
 *
 *   {"level":"info","time":"2026-11-05T09:12:03.120Z","service":"deployment-service",
 *    "hostname":"…","requestId":"9f1c…","userId":"f2e4…","req":{"method":"POST",
 *    "path":"/api/deployments"},"res":{"statusCode":201},"durationMs":18,
 *    "msg":"POST /api/deployments 201 18ms"}
 *
 * Every other log written during the request (Nest Logger → pino) carries the same requestId.
 * Never logged: headers (Authorization, cookies), query strings, bodies.
 */
export function accessLogOptions(config: AccessLogConfig): Options<Req, ServerResponse> {
  return {
    level: config.level,
    base: { service: config.service, hostname: hostname() },
    timestamp: stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) }, // "info", not 30: readable in Grafana
    // Defense in depth: the serializers below already drop headers.
    redact: { paths: ['req.headers', 'res.headers'], remove: true },

    genReqId: (req, res) => {
      const id = requestIdFrom(req.headers[REQUEST_ID_HEADER]);
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customAttributeKeys: { reqId: 'requestId', responseTime: 'durationMs' },
    quietReqLogger: true, // app logs during the request get only { requestId }, not the whole req

    // Evaluated again when the response finishes, i.e. after AuthGuard set req.user.
    customProps: (req) => (req.user ? { userId: req.user.id } : {}),

    autoLogging: { ignore: (req) => UNMEASURED_PATHS.has(pathOf(req.originalUrl ?? req.url)) },
    customLogLevel: (_req, res, err) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    customSuccessMessage: (req, res, ms) =>
      `${req.method} ${pathOf(req.originalUrl ?? req.url)} ${res.statusCode} ${ms}ms`,
    customErrorMessage: (req, res) =>
      `${req.method} ${pathOf(req.originalUrl ?? req.url)} ${res.statusCode}`,

    serializers: {
      // Receives pino-http's request summary; keep only what's safe and useful.
      req: (req: { method?: string; url?: string }) => ({
        method: req.method,
        path: pathOf(req.url),
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      err: stdSerializers.err,
    },

    transport:
      config.format === 'pretty'
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname,service,req,res',
            },
          }
        : undefined,
  };
}
