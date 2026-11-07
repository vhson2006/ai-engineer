import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { REQUEST_ID_HEADER, requestIdFrom } from './access-log';

/**
 * The current HTTP request's id, available anywhere below the controller (services, HttpClient)
 * without passing it around. HttpClient sends it as X-Request-Id to upstreams, so one id follows
 * a request through every system it touches (and through every log line, see access-log.ts).
 *
 * Register once per HTTP app:  app.use(requestContextMiddleware)  (deployment-service: setup.ts).
 * Works whether it runs before or after pino-http: it reuses the id pino-http already chose,
 * or fixes one that pino-http will then pick up from the request header.
 */
export interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Runs `fn` with a request id (tests, NATS event handlers that carry one). */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

export function requestContextMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const chosen = res.getHeader('X-Request-Id');
  const requestId =
    typeof chosen === 'string' ? chosen : requestIdFrom(req.headers[REQUEST_ID_HEADER]);
  req.headers[REQUEST_ID_HEADER] = requestId;
  storage.run({ requestId }, next);
}
