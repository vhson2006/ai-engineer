import {
  backoffDelay,
  DEFAULT_RETRY,
  isRetryableMethod,
  isRetryableStatus,
  parseRetryAfter,
} from './retry';

describe('[retry] (unit)', () => {
  it('retries idempotent methods, and POST/PATCH only with an idempotency key', () => {
    expect(['GET', 'HEAD', 'PUT', 'DELETE'].every((m) => isRetryableMethod(m, false))).toBe(true);
    expect(isRetryableMethod('POST', false)).toBe(false);
    expect(isRetryableMethod('PATCH', false)).toBe(false);
    expect(isRetryableMethod('POST', true)).toBe(true);
  });

  it.each([408, 425, 429, 500, 502, 503, 504])('status %i is transient', (status) => {
    expect(isRetryableStatus(status)).toBe(true);
  });
  it.each([400, 401, 403, 404, 409, 422, 501])('status %i is not retried', (status) => {
    expect(isRetryableStatus(status)).toBe(false);
  });

  it('parses Retry-After as seconds or as an HTTP date', () => {
    const now = Date.parse('2026-11-05T10:00:00Z');
    expect(parseRetryAfter('3', now)).toBe(3000);
    expect(parseRetryAfter('Thu, 05 Nov 2026 10:00:10 GMT', now)).toBe(10_000);
    expect(parseRetryAfter('soon', now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });

  it('backs off exponentially with full jitter, capped at maxDelayMs', () => {
    const max = () => 1; // the random draw at its maximum
    expect(backoffDelay(1, DEFAULT_RETRY, undefined, max)).toBe(100);
    expect(backoffDelay(2, DEFAULT_RETRY, undefined, max)).toBe(200);
    expect(backoffDelay(5, DEFAULT_RETRY, undefined, max)).toBe(1000); // capped
    expect(backoffDelay(3, DEFAULT_RETRY, undefined, () => 0)).toBe(0);
  });

  it('uses Retry-After when it fits, refuses to wait longer than maxDelayMs', () => {
    expect(backoffDelay(1, DEFAULT_RETRY, 500)).toBe(500);
    expect(backoffDelay(1, DEFAULT_RETRY, 5000)).toBeUndefined();
  });
});
