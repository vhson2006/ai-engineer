import 'server-only';
import { randomUUID } from 'node:crypto';
import { AuthUnavailableError } from '../auth/token-refresh';

/**
 * HTTP client for OUR API (KrakenD → services), server side only. Use it through `apiFetch`
 * (lib/api/), which plugs in the user's session token. Every call:
 *
 * - sends `Authorization: Bearer <access token>` and an `X-Request-Id` (same id on every retry,
 *   so one user action = one id in the API logs);
 * - has a timeout per attempt (default 8 s) and an overall budget (default 15 s);
 * - RETRIES only what is safe to repeat: network errors, timeouts, 502/503/504 and 429, and only
 *   for idempotent methods (GET, HEAD, OPTIONS, PUT, DELETE) or a request with an
 *   `idempotencyKey`. Backoff: exponential with full jitter; `Retry-After` is honoured (a longer
 *   wait than `maxRetryAfterMs` is returned to the caller instead of blocking the render);
 * - on 401, renews the token ONCE and repeats (any method: a 401 means nothing was executed);
 * - NEVER throws for HTTP or network problems: it returns an ApiResult. Branch on `ok`, then on
 *   `status` / `code`. `message` is safe to show to users; `requestId` lets support find the logs.
 */

export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface FieldError {
  field: string;
  message: string;
}

/** Error body of the API: RFC 9457 Problem Details (application/problem+json). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  instance?: string;
  requestId?: string;
  errors?: FieldError[];
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T; headers: Headers; requestId: string }
  | {
      ok: false;
      /** HTTP status; 503 / 504 when the API couldn't be reached / didn't answer in time. */
      status: number;
      /** Machine-readable reason: the API's `code`, or one of ours (see CLIENT_CODES). */
      code: string;
      /** Safe to show to the user. */
      message: string;
      /** Per-field validation errors (400 validation_error). */
      errors?: FieldError[];
      /** Seconds, when the API asked us to come back later (429 / 503 with Retry-After). */
      retryAfterS?: number;
      headers?: Headers;
      requestId: string;
    };

export interface ApiRequestOptions {
  method?: HttpMethod;
  /** Added to the URL; undefined values are skipped. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Sent as JSON. */
  body?: unknown;
  /** Extra request headers. KrakenD forwards only the headers it lists per endpoint. */
  headers?: Record<string, string>;
  /** Makes a POST/PATCH retryable: sent as Idempotency-Key, the API must deduplicate on it. */
  idempotencyKey?: string;
  /**
   * The endpoint is idempotent by design although it's a POST (e.g. /api/files/:id/complete:
   * calling it twice gives the same result), so it may be retried without an idempotency key.
   */
  idempotent?: boolean;
  /** Retries after the first attempt (default 2). 0 = no retry. */
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ApiClientConfig {
  baseUrl: string;
  /** A valid access token, null when signed out; throws AuthUnavailableError. */
  getToken(): Promise<string | null>;
  /** A new token after `rejected` got a 401; null when the session is over. */
  renewToken(rejected: string): Promise<string | null>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  log?: (message: string) => void;
  timeoutMs?: number;
  budgetMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxRetryAfterMs?: number;
}

/** Codes this client produces itself (the API's own codes come from its Problem Details). */
export const CLIENT_CODES = {
  unauthenticated: 'unauthenticated',
  authUnavailable: 'auth_unavailable',
  unreachable: 'api_unreachable',
  timeout: 'api_timeout',
  aborted: 'aborted',
  invalidResponse: 'invalid_response',
} as const;

const IDEMPOTENT: ReadonlySet<HttpMethod> = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
const RETRYABLE_STATUS: ReadonlySet<number> = new Set([429, 502, 503, 504]);

/** Messages for responses without a usable body (KrakenD's own 401/403 have an EMPTY body). */
const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'The request is invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do this.",
  404: 'Not found.',
  409: 'This conflicts with the current state. Refresh and try again.',
  413: 'The request is too large.',
  415: 'Unsupported content type.',
  422: 'The request could not be processed.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side.',
  502: 'A service is not responding correctly. Try again in a moment.',
  503: 'The service is temporarily unavailable. Try again in a moment.',
  504: 'The service took too long to answer. Try again in a moment.',
};

const defaultMessage = (status: number) =>
  DEFAULT_MESSAGES[status] ??
  (status >= 500 ? DEFAULT_MESSAGES[500] : `The request failed (HTTP ${status}).`);

type Attempt =
  | { kind: 'response'; response: Response }
  | { kind: 'timeout' }
  | { kind: 'aborted' }
  | { kind: 'network'; error: unknown };

export function createApiClient(config: ApiClientConfig) {
  const doFetch = config.fetch ?? fetch;
  const sleep = config.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = config.random ?? Math.random;
  const log = config.log ?? ((m: string) => console.warn(m));
  const budgetMs = config.budgetMs ?? 15_000;
  const baseDelayMs = config.baseDelayMs ?? 250;
  const maxDelayMs = config.maxDelayMs ?? 2_000;
  const maxRetryAfterMs = config.maxRetryAfterMs ?? 3_000;

  return async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
    const method = options.method ?? 'GET';
    const requestId = randomUUID();
    const label = `${method} ${path.split('?')[0]}`;
    const fail = (status: number, code: string, message = defaultMessage(status)) =>
      ({ ok: false, status, code, message, requestId }) as const;

    let token: string | null;
    try {
      token = await config.getToken();
    } catch (error) {
      if (error instanceof AuthUnavailableError) {
        return fail(503, CLIENT_CODES.authUnavailable, 'The sign-in service is temporarily unavailable. Try again in a moment.');
      }
      throw error; // a bug (or Redis down): let the page's error boundary handle it
    }
    if (!token) return fail(401, CLIENT_CODES.unauthenticated);

    const url = buildUrl(config.baseUrl, path, options.query);
    const retryable =
      IDEMPOTENT.has(method) || options.idempotent === true || options.idempotencyKey !== undefined;
    const maxRetries = retryable ? (options.retries ?? 2) : 0;
    const started = Date.now();
    let renewed = false;
    let retry = 0;

    for (;;) {
      const attempt = await send(token);

      // 401: the token was refused (revoked, expired early, clock skew). Renew once and repeat.
      if (attempt.kind === 'response' && attempt.response.status === 401 && !renewed) {
        renewed = true;
        discard(attempt);
        let next: string | null;
        try {
          next = await config.renewToken(token);
        } catch (error) {
          if (error instanceof AuthUnavailableError) {
            return fail(503, CLIENT_CODES.authUnavailable, 'The sign-in service is temporarily unavailable. Try again in a moment.');
          }
          throw error;
        }
        if (!next) return fail(401, CLIENT_CODES.unauthenticated);
        token = next;
        continue;
      }

      const delay = retryDelay(attempt, retry);
      if (delay !== undefined && retry < maxRetries && Date.now() - started + delay < budgetMs) {
        retry++;
        discard(attempt);
        log(`[api] ${label} → ${describe(attempt)}, retry ${retry}/${maxRetries} in ${delay} ms [requestId=${requestId}]`);
        await sleep(delay);
        continue;
      }

      const result = await toResult<T>(attempt);
      if (!result.ok && (result.status >= 500 || attempt.kind !== 'response')) {
        log(`[api] ${label} failed: ${describe(attempt)} after ${retry + 1} attempt(s) [requestId=${result.requestId}]`);
      }
      return result;
    }

    async function send(bearer: string): Promise<Attempt> {
      const timeout = AbortSignal.timeout(options.timeoutMs ?? config.timeoutMs ?? 8_000);
      const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
      const headers: Record<string, string> = {
        Accept: 'application/json, application/problem+json',
        ...options.headers,
        Authorization: `Bearer ${bearer}`,
        'X-Request-Id': requestId,
      };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
      try {
        const response = await doFetch(url, {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          cache: 'no-store',
          redirect: 'manual', // the API never redirects; never send the token elsewhere
          signal,
        });
        return { kind: 'response', response };
      } catch (error) {
        if (options.signal?.aborted) return { kind: 'aborted' };
        if (timeout.aborted) return { kind: 'timeout' };
        return { kind: 'network', error };
      }
    }

    /** ms to wait before retrying, or undefined when this outcome must not be retried. */
    function retryDelay(attempt: Attempt, retryIndex: number): number | undefined {
      if (attempt.kind === 'aborted') return undefined;
      if (attempt.kind === 'response') {
        if (!RETRYABLE_STATUS.has(attempt.response.status)) return undefined;
        const after = retryAfterMs(attempt.response.headers.get('retry-after'));
        if (after !== undefined) return after <= maxRetryAfterMs ? after : undefined;
      }
      // Full jitter: random in [0, min(max, base * 2^n)].
      return Math.round(random() * Math.min(maxDelayMs, baseDelayMs * 2 ** retryIndex));
    }

    async function toResult<R>(attempt: Attempt): Promise<ApiResult<R>> {
      if (attempt.kind === 'timeout') return fail(504, CLIENT_CODES.timeout);
      if (attempt.kind === 'aborted') return fail(499, CLIENT_CODES.aborted, 'The request was cancelled.');
      if (attempt.kind === 'network') return fail(503, CLIENT_CODES.unreachable, 'The API is unreachable. Try again in a moment.');

      const { response } = attempt;
      const responseId = response.headers.get('x-request-id') ?? requestId;
      const text = await response.text().catch(() => '');

      if (response.ok) {
        if (!text) return { ok: true, status: response.status, data: undefined as R, headers: response.headers, requestId: responseId };
        if (!isJson(response.headers.get('content-type'))) {
          return { ...fail(502, CLIENT_CODES.invalidResponse, defaultMessage(502)), requestId: responseId };
        }
        try {
          return { ok: true, status: response.status, data: JSON.parse(text) as R, headers: response.headers, requestId: responseId };
        } catch {
          return { ...fail(502, CLIENT_CODES.invalidResponse, defaultMessage(502)), requestId: responseId };
        }
      }

      if (response.status >= 300 && response.status < 400) {
        // redirect: 'manual'. Our API answers with JSON, never 3xx.
        return { ...fail(502, CLIENT_CODES.invalidResponse, defaultMessage(502)), requestId: responseId };
      }

      const problem = parseProblem(text);
      const retryAfter = retryAfterMs(response.headers.get('retry-after'));
      return {
        ok: false,
        status: response.status,
        code: problem?.code ?? codeOf(response.status),
        // 5xx details are not for end users (and our API hides them anyway).
        message: (response.status < 500 && problem?.detail) || defaultMessage(response.status),
        ...(problem?.errors?.length ? { errors: problem.errors } : {}),
        ...(retryAfter !== undefined ? { retryAfterS: Math.ceil(retryAfter / 1000) } : {}),
        headers: response.headers,
        requestId: problem?.requestId ?? responseId,
      };
    }
  };
}

function buildUrl(baseUrl: string, path: string, query: ApiRequestOptions['query']): string {
  if (!path.startsWith('/')) throw new Error(`API path must start with "/": ${path}`);
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

const isJson = (contentType: string | null) => !!contentType && /^application\/([\w.-]+\+)?json/i.test(contentType);

function parseProblem(text: string): ProblemDetails | null {
  try {
    const body = JSON.parse(text) as Partial<ProblemDetails> | null;
    return body && typeof body.status === 'number' && typeof body.title === 'string' ? (body as ProblemDetails) : null;
  } catch {
    return null;
  }
}

/** Retry-After: delay-seconds or an HTTP-date (RFC 9110 §10.2.3), in ms. */
export function retryAfterMs(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const value = header.trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

const CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'unprocessable_entity',
  429: 'too_many_requests',
  500: 'internal_error',
  502: 'bad_gateway',
  503: 'service_unavailable',
  504: 'gateway_timeout',
};
const codeOf = (status: number) => CODES[status] ?? `http_${status}`;

/** Frees the connection of a response we won't read. */
function discard(attempt: Attempt): void {
  if (attempt.kind === 'response') attempt.response.body?.cancel().catch(() => undefined);
}

function describe(attempt: Attempt): string {
  switch (attempt.kind) {
    case 'response':
      return `HTTP ${attempt.response.status}`;
    case 'timeout':
      return 'timeout';
    case 'aborted':
      return 'aborted';
    case 'network': {
      const cause = (attempt.error as { cause?: { code?: string } })?.cause?.code;
      return `network ${cause ?? (attempt.error instanceof Error ? attempt.error.message : 'error')}`;
    }
  }
}
