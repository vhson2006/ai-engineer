import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, retryAfterMs, type ApiClientConfig } from './client';
import { AuthUnavailableError } from '../auth/token-refresh';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json', ...headers },
  });
const empty = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });
const problem = (status: number, code: string, detail: string, extra: Record<string, unknown> = {}) =>
  json(status, { type: 'about:blank', title: 'x', status, detail, code, requestId: 'api-req-1', ...extra });

let fetchMock: ReturnType<typeof vi.fn>;
let sleeps: number[];
let logs: string[];

function client(overrides: Partial<ApiClientConfig> = {}) {
  return createApiClient({
    baseUrl: 'http://api.test',
    getToken: async () => 'token-1',
    renewToken: async () => 'token-2',
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
    log: (m) => logs.push(m),
    ...overrides,
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  sleeps = [];
  logs = [];
});

const sentHeaders = (call: number) => fetchMock.mock.calls[call][1].headers as Record<string, string>;

describe('apiFetch: success', () => {
  it('200 JSON → data; sends Bearer token, X-Request-Id, query (undefined skipped), no-store', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 1 }));

    const result = await client()<{ id: number }>('/api/things', { query: { page: 2, search: undefined } });

    expect(result).toMatchObject({ ok: true, status: 200, data: { id: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/things?page=2');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', redirect: 'manual' });
    expect(sentHeaders(0)).toMatchObject({ Authorization: 'Bearer token-1' });
    expect(sentHeaders(0)['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('201 with body + Location header available; 204 → data undefined', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { id: 'a' }, { Location: '/api/things/a' }));
    fetchMock.mockResolvedValueOnce(empty(204));

    const created = await client()('/api/things', { method: 'POST', body: { name: 'x' } });
    const deleted = await client()('/api/things/a', { method: 'DELETE' });

    expect(created.ok && created.headers.get('location')).toBe('/api/things/a');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"name":"x"}');
    expect(sentHeaders(0)['Content-Type']).toBe('application/json');
    expect(deleted).toMatchObject({ ok: true, status: 204, data: undefined });
  });

  it('2xx with a non-JSON or broken body → 502 invalid_response (never a crash)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    fetchMock.mockResolvedValueOnce(new Response('{oops', { status: 200, headers: { 'Content-Type': 'application/json' } }));

    expect(await client()('/a')).toMatchObject({ ok: false, status: 502, code: 'invalid_response' });
    expect(await client()('/a')).toMatchObject({ ok: false, status: 502, code: 'invalid_response' });
  });
});

describe('apiFetch: errors', () => {
  it('Problem Details → status, code, detail, field errors, the API request id', async () => {
    fetchMock.mockResolvedValue(
      problem(400, 'validation_error', 'The request is invalid', { errors: [{ field: 'name', message: 'required' }] }),
    );

    const result = await client()('/a', { method: 'POST', body: {} });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: 400,
        code: 'validation_error',
        message: 'The request is invalid',
        errors: [{ field: 'name', message: 'required' }],
        requestId: 'api-req-1',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1); // 4xx: never retried
  });

  it("KrakenD's empty 403 → default message and code", async () => {
    fetchMock.mockResolvedValue(empty(403));
    expect(await client()('/a')).toMatchObject({ ok: false, status: 403, code: 'forbidden', message: "You don't have permission to do this." });
  });

  it('409 / 422 / 404 keep the API code', async () => {
    fetchMock.mockResolvedValue(problem(422, 'missing_translations', 'Every language of the site is needed'));
    expect(await client()('/a', { method: 'PATCH', body: {} })).toMatchObject({ status: 422, code: 'missing_translations' });
  });

  it('5xx details are never shown to users', async () => {
    fetchMock.mockResolvedValue(problem(500, 'internal_error', 'TypeError at line 42'));
    const result = await client()('/a', { method: 'POST' });
    expect(result).toMatchObject({ status: 500, message: 'Something went wrong on our side.' });
  });

  it('a 3xx is not followed (token never sent elsewhere) → 502', async () => {
    fetchMock.mockResolvedValue(empty(302, { Location: 'https://evil.example' }));
    expect(await client()('/a')).toMatchObject({ ok: false, status: 502, code: 'invalid_response' });
  });
});

describe('apiFetch: retries', () => {
  it('GET: 503 then 200 → retried with backoff, same X-Request-Id', async () => {
    fetchMock.mockResolvedValueOnce(empty(503)).mockResolvedValueOnce(json(200, { ok: 1 }));

    const result = await client()('/a');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentHeaders(1)['X-Request-Id']).toBe(sentHeaders(0)['X-Request-Id']);
    expect(sleeps).toEqual([125]); // 0.5 * 250 * 2^0
  });

  it('GET: network error then timeout then 200 → 2 retries with exponential backoff', async () => {
    fetchMock
      .mockRejectedValueOnce(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }))
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
      .mockResolvedValueOnce(json(200, {}));

    expect((await client()('/a')).ok).toBe(true);
    expect(sleeps).toEqual([125, 250]);
    expect(logs[0]).toContain('network ECONNREFUSED');
  });

  it('gives up after the retries: 503 api_unreachable / 504 api_timeout', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await client()('/a')).toMatchObject({ ok: false, status: 503, code: 'api_unreachable' });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockReset();
    fetchMock.mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    expect(await client({ timeoutMs: 10 })('/a', { retries: 0 })).toMatchObject({ status: 504, code: 'api_timeout' });
  });

  it('POST / PATCH are NOT retried (could run twice)…', async () => {
    fetchMock.mockResolvedValue(empty(503));
    expect(await client()('/a', { method: 'POST', body: {} })).toMatchObject({ status: 503 });
    expect(await client()('/a', { method: 'PATCH', body: {} })).toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('…unless they carry an idempotency key', async () => {
    fetchMock.mockResolvedValueOnce(empty(502)).mockResolvedValueOnce(json(201, {}));
    const result = await client()('/orders', { method: 'POST', body: {}, idempotencyKey: 'order-42' });
    expect(result.ok).toBe(true);
    expect(sentHeaders(1)['Idempotency-Key']).toBe('order-42');
  });

  it('…or are declared idempotent by design (no key sent)', async () => {
    fetchMock.mockResolvedValueOnce(empty(503)).mockResolvedValueOnce(json(200, {}));
    const result = await client()('/files/1/complete', { method: 'POST', idempotent: true });
    expect(result.ok).toBe(true);
    expect(sentHeaders(1)['Idempotency-Key']).toBeUndefined();
  });

  it('429 honours Retry-After when short; a long one is returned to the caller instead of blocking', async () => {
    fetchMock.mockResolvedValueOnce(empty(429, { 'Retry-After': '1' })).mockResolvedValueOnce(json(200, {}));
    expect((await client()('/a')).ok).toBe(true);
    expect(sleeps).toEqual([1000]);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '120' } }));
    expect(await client()('/a')).toMatchObject({ ok: false, status: 429, retryAfterS: 120 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('500 is not retried (a bug, not a blip)', async () => {
    fetchMock.mockResolvedValue(empty(500));
    await client()('/a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a caller abort is never retried', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    expect(await client()('/a', { signal: controller.signal })).toMatchObject({ code: 'aborted' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('apiFetch: authentication', () => {
  it('signed out → 401 unauthenticated without calling the API', async () => {
    expect(await client({ getToken: async () => null })('/a')).toMatchObject({ status: 401, code: 'unauthenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Keycloak down and token expired → 503 auth_unavailable (not a logout)', async () => {
    const result = await client({
      getToken: async () => {
        throw new AuthUnavailableError();
      },
    })('/a');
    expect(result).toMatchObject({ status: 503, code: 'auth_unavailable' });
  });

  it('401 from the API → renews the token once and repeats (even a POST: nothing ran)', async () => {
    const renewToken = vi.fn(async () => 'token-2');
    fetchMock.mockResolvedValueOnce(empty(401)).mockResolvedValueOnce(json(201, {}));

    const result = await client({ renewToken })('/a', { method: 'POST', body: {} });

    expect(result.ok).toBe(true);
    expect(renewToken).toHaveBeenCalledWith('token-1');
    expect(sentHeaders(1).Authorization).toBe('Bearer token-2');
  });

  it('401 again after renewal → 401 (no loop); session over → 401 unauthenticated', async () => {
    fetchMock.mockResolvedValue(empty(401));
    expect(await client()('/a')).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockClear();
    expect(await client({ renewToken: async () => null })('/a')).toMatchObject({ status: 401, code: 'unauthenticated' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('retryAfterMs', () => {
  it('parses delay-seconds and HTTP-dates', () => {
    expect(retryAfterMs('3')).toBe(3000);
    expect(retryAfterMs(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(retryAfterMs('soon')).toBeUndefined();
    expect(retryAfterMs(null)).toBeUndefined();
  });
});
