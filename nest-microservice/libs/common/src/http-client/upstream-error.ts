/**
 * What can go wrong when calling another system ("upstream"). One error class with a `kind`, so
 * callers and the exception filter can react without parsing messages.
 *
 *   timeout           an attempt took longer than timeoutMs, or the total budget ran out
 *   network           no HTTP response: DNS failure, connection refused/reset, TLS error
 *   http              the upstream answered with a status we don't accept (see `status`)
 *   invalid_response  the body isn't what we expect (bad JSON, failed `parse` validation)
 *   too_large         the body is bigger than maxResponseBytes
 *   aborted           the caller cancelled (its AbortSignal fired); never retried
 *
 * toProblem (errors/problem-details.ts) turns it into 502 / 503 / 504 for OUR client, with a
 * generic message: the upstream's name, URL and body are never sent to our caller.
 */
export type UpstreamErrorKind =
  'timeout' | 'network' | 'http' | 'invalid_response' | 'too_large' | 'aborted';

export interface UpstreamErrorDetails {
  upstream: string;
  kind: UpstreamErrorKind;
  method: string;
  /** Path WITHOUT query string (queries can carry user input or secrets). */
  path: string;
  attempts: number;
  status?: number;
  /** Low-level code for network errors (ECONNREFUSED, ENOTFOUND, UND_ERR_SOCKET...). */
  code?: string;
  /** Milliseconds the upstream asked us to wait (Retry-After), when it said so. */
  retryAfterMs?: number;
  /** First characters of the upstream's error body, for debugging. Never logged or returned by us. */
  responseSnippet?: string;
}

export class UpstreamError extends Error {
  readonly upstream: string;
  readonly kind: UpstreamErrorKind;
  readonly method: string;
  readonly path: string;
  readonly attempts: number;
  readonly status?: number;
  readonly code?: string;
  readonly retryAfterMs?: number;
  readonly responseSnippet?: string;

  constructor(details: UpstreamErrorDetails, options?: { cause?: unknown }) {
    const what =
      details.kind === 'http'
        ? `HTTP ${details.status}`
        : [details.kind, details.code, details.status ? `(HTTP ${details.status})` : '']
            .filter(Boolean)
            .join(' ');
    super(
      `${details.upstream} ${details.method} ${details.path} failed: ${what} (attempts: ${details.attempts})`,
      options,
    );
    this.name = 'UpstreamError';
    this.upstream = details.upstream;
    this.kind = details.kind;
    this.method = details.method;
    this.path = details.path;
    this.attempts = details.attempts;
    this.status = details.status;
    this.code = details.code;
    this.retryAfterMs = details.retryAfterMs;
    this.responseSnippet = details.responseSnippet;
  }

  /** The upstream said the resource doesn't exist. Often a normal outcome: return null instead. */
  get isNotFound(): boolean {
    return this.kind === 'http' && this.status === 404;
  }
}
