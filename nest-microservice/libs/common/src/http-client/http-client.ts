import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { currentRequestId } from '../logging/request-context';
import {
  backoffDelay,
  DEFAULT_RETRY,
  isRetryableMethod,
  isRetryableStatus,
  parseRetryAfter,
  RetryPolicy,
} from './retry';
import { UpstreamError, UpstreamErrorKind } from './upstream-error';

/**
 * Calls an EXTERNAL HTTP API (another company's API, another system) with the defaults every
 * such call needs: timeouts, safe retries with backoff, Retry-After, typed errors, request-id
 * propagation, response size limit and no secrets in logs. Native fetch, no dependency.
 *
 * One instance per upstream, created in a small client class (see .claude/rules/microservice.md):
 *
 *   const registry = new HttpClient({
 *     name: 'artifact-registry',                     // used in logs and errors
 *     baseUrl: config.getOrThrow('REGISTRY_URL'),
 *     headers: () => ({ Authorization: `Bearer ${config.getOrThrow('REGISTRY_TOKEN')}` }),
 *   });
 *
 *   const { data } = await registry.get('/images/{name}/tags/{tag}', {
 *     params: { name, tag },                         // URL-encoded: no path injection
 *     query: { arch: 'amd64' },
 *     parse: toImageInfo,                            // validate the shape, return OUR type
 *   });
 *
 *   await payments.post('/charges', { body, idempotencyKey: orderId }); // POST retried only with a key
 *
 * Non-2xx statuses throw UpstreamError (kind 'http'), unless listed in `allowStatus`:
 *   const res = await registry.get('/images/{name}', { params: { name }, allowStatus: [404] });
 *   if (res.status === 404) return null;
 *
 * Budget: keep totalTimeoutMs below what OUR caller waits (KrakenD's timeout is 5 s).
 */

type QueryValue = string | number | boolean | undefined | null;
type HeaderMap = Record<string, string>;

export interface HttpClientOptions {
  /** Short name of the upstream, for logs and errors ("artifact-registry"). */
  name: string;
  /** e.g. https://api.example.com/v1 (paths are appended to it). */
  baseUrl: string;
  /** Static headers, or a function evaluated per request (rotating tokens). */
  headers?: HeaderMap | (() => HeaderMap | Promise<HeaderMap>);
  /** Per attempt. Default 2000 ms. */
  timeoutMs?: number;
  /** All attempts + backoff together. Default 4000 ms (under KrakenD's 5 s). */
  totalTimeoutMs?: number;
  /** Default: 3 attempts, 100 ms base, 1000 ms max delay. `{ maxAttempts: 1 }` disables retries. */
  retry?: Partial<RetryPolicy>;
  /** Default 1 MiB. Bigger bodies throw UpstreamError 'too_large'. */
  maxResponseBytes?: number;
}

export interface RequestOptions<T> {
  /** Values for {placeholders} in the path, URL-encoded. */
  params?: Record<string, string | number>;
  /** Appended as ?a=1&b=2 (undefined/null values are skipped). */
  query?: Record<string, QueryValue | QueryValue[]>;
  headers?: HeaderMap;
  /** Objects are sent as JSON; strings/Buffers/URLSearchParams as-is. */
  body?: unknown;
  /** Sent as Idempotency-Key and makes POST/PATCH retryable. Use a stable business id. */
  idempotencyKey?: string;
  /** Statuses returned instead of thrown (typically [404]). */
  allowStatus?: number[];
  /** Validates/maps the parsed body. Throw to reject it (→ UpstreamError 'invalid_response'). */
  parse?: (body: unknown) => T;
  /** Overrides for this call. */
  timeoutMs?: number;
  retry?: Partial<RetryPolicy>;
  /** Cancel from outside (e.g. the incoming request was aborted). */
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  /** Parsed JSON (or `parse` result), text for non-JSON, undefined for empty bodies. */
  data: T;
  attempts: number;
  durationMs: number;
}

const NETWORK_ERROR = 'fetch failed';
const SNIPPET_CHARS = 500;

export class HttpClient {
  private readonly logger: Logger;
  private readonly baseUrl: string;

  constructor(private readonly options: HttpClientOptions) {
    this.logger = new Logger(`HttpClient:${options.name}`);
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
  }

  get<T = unknown>(path: string, options?: RequestOptions<T>) {
    return this.request<T>('GET', path, options);
  }
  post<T = unknown>(path: string, options?: RequestOptions<T>) {
    return this.request<T>('POST', path, options);
  }
  put<T = unknown>(path: string, options?: RequestOptions<T>) {
    return this.request<T>('PUT', path, options);
  }
  patch<T = unknown>(path: string, options?: RequestOptions<T>) {
    return this.request<T>('PATCH', path, options);
  }
  delete<T = unknown>(path: string, options?: RequestOptions<T>) {
    return this.request<T>('DELETE', path, options);
  }

  async request<T = unknown>(
    method: string,
    pathTemplate: string,
    options: RequestOptions<T> = {},
  ): Promise<HttpResponse<T>> {
    const path = fillPath(pathTemplate, options.params);
    const url = this.baseUrl + path + toQueryString(options.query);
    const policy: RetryPolicy = { ...DEFAULT_RETRY, ...this.options.retry, ...options.retry };
    const retryable = isRetryableMethod(method, Boolean(options.idempotencyKey));
    const timeoutMs = options.timeoutMs ?? this.options.timeoutMs ?? 2000;
    const deadline = Date.now() + (this.options.totalTimeoutMs ?? 4000);
    const started = Date.now();
    // Same id on every attempt: the upstream (and our logs) see one logical request.
    const requestId = currentRequestId() ?? randomUUID();
    const headers = await this.buildHeaders(options, requestId);
    const body = encodeBody(options.body, headers);

    const fail = (
      kind: UpstreamErrorKind,
      attempts: number,
      extra: Partial<UpstreamError> & { cause?: unknown } = {},
    ): UpstreamError => {
      const { cause, ...details } = extra;
      const error = new UpstreamError(
        { upstream: this.options.name, kind, method, path, attempts, ...details },
        { cause },
      );
      this.logger.warn(
        `${method} ${path} failed: ${describeFailure(kind, error.status, error.code)}` +
          ` after ${attempts} attempt(s), ${Date.now() - started} ms [requestId=${requestId}]`,
      );
      return error;
    };

    for (let attempt = 1; ; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw fail('timeout', attempt - 1);
      const attemptSignal = AbortSignal.timeout(Math.min(timeoutMs, remaining));
      const signal = options.signal
        ? AbortSignal.any([options.signal, attemptSignal])
        : attemptSignal;

      // Outcome of this attempt: a response, or an error to maybe retry.
      let failure: {
        kind: UpstreamErrorKind;
        status?: number;
        code?: string;
        retryAfterMs?: number;
        snippet?: string;
        cause?: unknown;
      };
      try {
        // 'manual': a 3xx is returned, not followed, so credentials never go to another host.
        // It then counts as a non-2xx status (UpstreamError 'http') unless allowStatus lists it.
        const res = await fetch(url, { method, headers, body, signal, redirect: 'manual' });

        if (res.ok || options.allowStatus?.includes(res.status)) {
          const data = await this.readBody(res, signal).catch((error: unknown) => {
            if (error instanceof UpstreamError) throw error;
            throw fail(isTimeout(error) ? 'timeout' : 'invalid_response', attempt, {
              status: res.status,
              cause: error,
            });
          });
          if (data instanceof SizeExceeded) {
            throw fail('too_large', attempt, { status: res.status });
          }
          let parsed: T;
          try {
            parsed = options.parse ? options.parse(data) : (data as T);
          } catch (error) {
            throw fail('invalid_response', attempt, { status: res.status, cause: error });
          }
          return {
            status: res.status,
            headers: res.headers,
            data: parsed,
            attempts: attempt,
            durationMs: Date.now() - started,
          };
        }

        failure = {
          kind: 'http',
          status: res.status,
          retryAfterMs: parseRetryAfter(res.headers.get('retry-after')),
          snippet: await readSnippet(res),
        };
      } catch (error) {
        if (error instanceof UpstreamError) throw error;
        if (options.signal?.aborted) throw fail('aborted', attempt, { cause: error });
        failure = isTimeout(error)
          ? { kind: 'timeout', cause: error }
          : { kind: 'network', code: networkCode(error), cause: error };
      }

      const transient = failure.kind !== 'http' || isRetryableStatus(failure.status!);
      const delay =
        retryable && transient && attempt < policy.maxAttempts
          ? backoffDelay(attempt, policy, failure.retryAfterMs)
          : undefined;

      if (delay === undefined || Date.now() + delay >= deadline) {
        throw fail(failure.kind, attempt, {
          status: failure.status,
          code: failure.code,
          retryAfterMs: failure.retryAfterMs,
          responseSnippet: failure.snippet,
          cause: failure.cause,
        });
      }

      this.logger.warn(
        `${method} ${path} → ${describeFailure(failure.kind, failure.status, failure.code)},` +
          ` retry ${attempt}/${policy.maxAttempts - 1} in ${delay} ms [requestId=${requestId}]`,
      );
      try {
        await sleep(delay, options.signal);
      } catch (error) {
        throw fail('aborted', attempt, { cause: error });
      }
    }
  }

  private async buildHeaders(
    options: RequestOptions<unknown>,
    requestId: string,
  ): Promise<HeaderMap> {
    const base =
      typeof this.options.headers === 'function'
        ? await this.options.headers()
        : (this.options.headers ?? {});
    const headers: HeaderMap = {
      Accept: 'application/json',
      'User-Agent': `nest-microservice (${this.options.name})`,
      'X-Request-Id': requestId,
      ...base,
      ...options.headers,
    };
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    return headers;
  }

  /** JSON → object, other text → string, empty → undefined. Stops reading past maxResponseBytes. */
  private async readBody(res: Response, signal: AbortSignal): Promise<unknown> {
    const limit = this.options.maxResponseBytes ?? 1024 * 1024;
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) {
      await res.body?.cancel();
      return new SizeExceeded();
    }
    if (!res.body || res.status === 204 || res.status === 205) return undefined;

    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (;;) {
      if (signal.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return new SizeExceeded();
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (text.length === 0) return undefined;
    const type = res.headers.get('content-type') ?? '';
    return /[/+]json\b/i.test(type) ? (JSON.parse(text) as unknown) : text;
  }
}

class SizeExceeded {}

/** "/images/{name}" + { name: "a/b" } → "/images/a%2Fb". A missing param is a programming error. */
export function fillPath(template: string, params: Record<string, string | number> = {}): string {
  const path = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params)) throw new Error(`HttpClient: missing path param "${key}" in ${template}`);
    return encodeURIComponent(String(params[key]));
  });
  return path.startsWith('/') ? path : `/${path}`;
}

export function toQueryString(query?: Record<string, QueryValue | QueryValue[]>): string {
  if (!query) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) search.append(key, String(item));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function encodeBody(body: unknown, headers: HeaderMap): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string' || body instanceof URLSearchParams || body instanceof Uint8Array) {
    return body as BodyInit;
  }
  if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  return JSON.stringify(body);
}

async function readSnippet(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    return text ? text.slice(0, SNIPPET_CHARS) : undefined;
  } catch {
    return undefined;
  }
}

// fetch() errors are checked by shape, not `instanceof Error`: they can come from another realm
// (e.g. Jest's VM context), where instanceof is false.
type ErrorLike = { name?: unknown; message?: unknown; cause?: { code?: unknown } };

/** AbortSignal.timeout() fired: fetch rejects with DOMException 'TimeoutError'. */
function isTimeout(error: unknown): boolean {
  return (error as ErrorLike | null)?.name === 'TimeoutError';
}

/** fetch() rejects with TypeError('fetch failed') and the real reason (ECONNREFUSED...) in `cause`. */
function networkCode(error: unknown): string | undefined {
  const e = error as ErrorLike | null;
  if (typeof e?.cause?.code === 'string') return e.cause.code;
  if (e?.message === NETWORK_ERROR) return 'FETCH_FAILED';
  return typeof e?.name === 'string' ? e.name : undefined;
}

/** "timeout", "network ECONNREFUSED", "http 503", "invalid_response (HTTP 200)". */
export function describeFailure(kind: UpstreamErrorKind, status?: number, code?: string): string {
  if (kind === 'http') return `http ${status}`;
  return [kind, code, status ? `(HTTP ${status})` : undefined].filter(Boolean).join(' ');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason as Error);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      },
      { once: true },
    );
  });
}
