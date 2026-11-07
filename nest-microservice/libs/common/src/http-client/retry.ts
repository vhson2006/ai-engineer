/**
 * Retry rules for outbound HTTP. Pure functions, unit-tested in retry.spec.ts.
 *
 * Retry ONLY what is safe and likely to succeed next time:
 *  - the method is idempotent (GET, HEAD, OPTIONS, PUT, DELETE), or the request carries an
 *    Idempotency-Key (then POST/PATCH are safe too: the upstream de-duplicates);
 *  - the failure is transient: no response (network), attempt timeout, or one of
 *    408 Request Timeout, 425 Too Early, 429 Too Many Requests,
 *    500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.
 * Never retried: other 4xx (our request is wrong, it will fail again), invalid responses,
 * caller aborts.
 */

export interface RetryPolicy {
  /** Total attempts including the first one. 1 = no retry. */
  maxAttempts: number;
  /** First backoff ceiling; doubles each retry (exponential). */
  baseDelayMs: number;
  /** Backoff ceiling. A Retry-After above this is NOT waited for: the call fails instead. */
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000 };

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableMethod(method: string, hasIdempotencyKey: boolean): boolean {
  return hasIdempotencyKey || IDEMPOTENT_METHODS.has(method.toUpperCase());
}

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

/**
 * Retry-After header → milliseconds. Accepts delay-seconds ("120") or an HTTP date.
 * Returns undefined when absent or unparseable.
 */
export function parseRetryAfter(
  value: string | null,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/**
 * Delay before retry number `retry` (1 = first retry).
 * - The upstream's Retry-After wins when it fits under maxDelayMs; if it's longer, returns
 *   undefined = don't retry (waiting that long would exceed our own caller's patience).
 * - Otherwise exponential backoff with FULL jitter: random(0, min(max, base * 2^(retry-1))).
 *   Jitter spreads retries of many callers so they don't hit the upstream at the same instant.
 */
export function backoffDelay(
  retry: number,
  policy: RetryPolicy,
  retryAfterMs?: number,
  random: () => number = Math.random,
): number | undefined {
  if (retryAfterMs !== undefined) {
    return retryAfterMs <= policy.maxDelayMs ? retryAfterMs : undefined;
  }
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (retry - 1));
  return Math.round(random() * ceiling);
}
