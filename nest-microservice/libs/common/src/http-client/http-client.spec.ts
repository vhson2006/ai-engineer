import { AddressInfo } from 'node:net';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { toProblem } from '../errors/problem-details';
import { runWithRequestId } from '../logging/request-context';
import { fillPath, HttpClient, HttpClientOptions } from './http-client';
import { UpstreamError } from './upstream-error';

/**
 * Against a REAL local HTTP server (not a mocked fetch): timeouts, refused connections,
 * Retry-After and body limits behave exactly as in production.
 */
type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;

describe('[HttpClient] (unit, real HTTP server)', () => {
  let server: Server;
  let baseUrl: string;
  let handlers: Handler[];
  let seen: { method?: string; url?: string; headers: IncomingMessage['headers']; body: string }[];

  /** Each request is answered by the next handler; the last one repeats. */
  const respond = (...next: Handler[]) => {
    handlers = next;
  };
  const json =
    (status: number, data: unknown, headers: Record<string, string> = {}): Handler =>
    (_q, res) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
    };

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => (body += c.toString()));
      req.on('end', () => {
        seen.push({ method: req.method, url: req.url, headers: req.headers, body });
        const handler = handlers.length > 1 ? handlers.shift()! : handlers[0];
        handler(req, res, body);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => {
    seen = [];
    handlers = [];
  });

  const client = (options: Partial<HttpClientOptions> = {}) =>
    new HttpClient({
      name: 'test-api',
      baseUrl,
      retry: { baseDelayMs: 1, maxDelayMs: 50 },
      ...options,
    });

  const failure = async (promise: Promise<unknown>): Promise<UpstreamError> => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamError);
      return error as UpstreamError;
    }
    throw new Error('expected an UpstreamError');
  };

  describe('success', () => {
    it('GET: encodes path params, builds the query, parses JSON, sends standard headers', async () => {
      respond(json(200, { id: 'a/b', tags: 2 }));
      const res = await runWithRequestId('req-123', () =>
        client({ headers: { Authorization: 'Bearer t' } }).get('/images/{name}', {
          params: { name: 'a/b' },
          query: { arch: 'amd64', skip: undefined, tag: ['1', '2'] },
        }),
      );

      expect(res).toMatchObject({ status: 200, data: { id: 'a/b', tags: 2 }, attempts: 1 });
      expect(seen[0].url).toBe('/v1/images/a%2Fb?arch=amd64&tag=1&tag=2');
      expect(seen[0].headers).toMatchObject({
        accept: 'application/json',
        authorization: 'Bearer t',
        'x-request-id': 'req-123', // propagated from the current request
      });
    });

    it('POST: sends JSON with Content-Type', async () => {
      respond(json(201, { ok: true }));
      await client().post('/charges', { body: { amount: 5 } });
      expect(seen[0]).toMatchObject({ method: 'POST', body: '{"amount":5}' });
      expect(seen[0].headers['content-type']).toBe('application/json');
    });

    it('returns undefined data for 204 and text for non-JSON bodies', async () => {
      respond((_q, res) => res.writeHead(204).end());
      expect((await client().delete('/x')).data).toBeUndefined();

      respond((_q, res) => res.writeHead(200, { 'Content-Type': 'text/plain' }).end('pong'));
      expect((await client().get('/ping')).data).toBe('pong');
    });

    it('allowStatus returns the response instead of throwing (404 as a normal outcome)', async () => {
      respond(json(404, { message: 'nope' }));
      const res = await client().get('/images/{name}', {
        params: { name: 'x' },
        allowStatus: [404],
      });
      expect(res.status).toBe(404);
    });

    it('parse validates and maps the body to our own type', async () => {
      respond(json(200, { image_name: 'web' }));
      const res = await client().get('/x', {
        parse: (raw) => ({ name: (raw as { image_name: string }).image_name }),
      });
      expect(res.data).toEqual({ name: 'web' });
    });
  });

  describe('retries', () => {
    it('retries a GET on 503 and succeeds', async () => {
      respond(json(503, {}), json(200, { ok: 1 }));
      const res = await client().get('/x');
      expect(res).toMatchObject({ status: 200, attempts: 2 });
      expect(seen[0].headers['x-request-id']).toBe(seen[1].headers['x-request-id']); // same id
    });

    it('honours Retry-After on 429', async () => {
      respond(json(429, {}, { 'Retry-After': '0' }), json(200, {}));
      expect((await client().get('/x')).attempts).toBe(2);
    });

    it('gives up at once when Retry-After is longer than maxDelayMs', async () => {
      respond(json(429, {}, { 'Retry-After': '60' }));
      const error = await failure(client().get('/x'));
      expect(error).toMatchObject({ kind: 'http', status: 429, attempts: 1, retryAfterMs: 60_000 });
    });

    it('stops after maxAttempts', async () => {
      respond(json(502, {}));
      const error = await failure(client({ retry: { maxAttempts: 3, baseDelayMs: 1 } }).get('/x'));
      expect(error).toMatchObject({ kind: 'http', status: 502, attempts: 3 });
      expect(seen).toHaveLength(3);
    });

    it('never retries other 4xx (the request itself is wrong)', async () => {
      respond(json(400, { message: 'bad field' }));
      const error = await failure(client().get('/x'));
      expect(error).toMatchObject({ kind: 'http', status: 400, attempts: 1 });
      expect(error.responseSnippet).toContain('bad field');
    });

    it('does not retry a POST without an idempotency key', async () => {
      respond(json(503, {}));
      await failure(client().post('/charges', { body: {} }));
      expect(seen).toHaveLength(1);
    });

    it('retries a POST with an idempotency key, sending the same key each time', async () => {
      respond(json(503, {}), json(201, {}));
      const res = await client().post('/charges', { body: {}, idempotencyKey: 'order-42' });
      expect(res.attempts).toBe(2);
      expect(seen.map((s) => s.headers['idempotency-key'])).toEqual(['order-42', 'order-42']);
    });

    it('treats a redirect as an error instead of following it (no credentials to other hosts)', async () => {
      respond((_q, res) => res.writeHead(302, { Location: 'http://evil.example/' }).end());
      const error = await failure(client().get('/x'));
      expect(error).toMatchObject({ kind: 'http', status: 302 });
    });
  });

  describe('failures', () => {
    it('times out a slow attempt (kind timeout)', async () => {
      respond((_q, res) => setTimeout(() => res.writeHead(200).end('{}'), 500));
      const error = await failure(
        client({ timeoutMs: 50, retry: { maxAttempts: 1 } }).get('/slow'),
      );
      expect(error.kind).toBe('timeout');
    });

    it('respects the total budget across retries', async () => {
      respond((_q, res) => setTimeout(() => res.writeHead(200).end('{}'), 500));
      const started = Date.now();
      const error = await failure(
        client({ timeoutMs: 100, totalTimeoutMs: 250, retry: { maxAttempts: 10 } }).get('/slow'),
      );
      expect(error.kind).toBe('timeout');
      expect(Date.now() - started).toBeLessThan(450);
    });

    it('reports a refused connection as a network error with its code, after retries', async () => {
      const closed = createServer();
      await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
      const port = (closed.address() as AddressInfo).port;
      await new Promise<void>((resolve) => closed.close(() => resolve()));

      const error = await failure(client({ baseUrl: `http://127.0.0.1:${port}` }).get('/x'));
      expect(error).toMatchObject({ kind: 'network', code: 'ECONNREFUSED', attempts: 3 });
    });

    it('rejects invalid JSON and failed validation (kind invalid_response, no retry)', async () => {
      respond((_q, res) => res.writeHead(200, { 'Content-Type': 'application/json' }).end('{oops'));
      expect((await failure(client().get('/x'))).kind).toBe('invalid_response');

      respond(json(200, { unexpected: true }));
      const error = await failure(
        client().get('/x', {
          parse: () => {
            throw new Error('missing field name');
          },
        }),
      );
      expect(error).toMatchObject({ kind: 'invalid_response', attempts: 1 });
    });

    it('refuses a body bigger than maxResponseBytes', async () => {
      respond((_q, res) =>
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('x'.repeat(5000)),
      );
      const error = await failure(client({ maxResponseBytes: 1000 }).get('/big'));
      expect(error.kind).toBe('too_large');
    });

    it('stops when the caller aborts (kind aborted, no retry)', async () => {
      respond((_q, res) => setTimeout(() => res.writeHead(200).end('{}'), 500));
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30);
      const error = await failure(client().get('/slow', { signal: controller.signal }));
      expect(error).toMatchObject({ kind: 'aborted', attempts: 1 });
    });
  });

  describe('what OUR caller receives (toProblem)', () => {
    const upstream = (kind: UpstreamError['kind'], status?: number) =>
      new UpstreamError({ upstream: 'x', kind, method: 'GET', path: '/p', attempts: 1, status });

    it.each([
      ['timeout', undefined, 504],
      ['network', undefined, 503],
      ['http', 503, 503],
      ['http', 429, 503],
      ['http', 400, 502],
      ['http', 401, 502],
      ['invalid_response', 200, 502],
    ] as const)('%s %s → %i, without upstream details', (kind, status, expected) => {
      const payload = toProblem(upstream(kind, status));
      expect(payload.status).toBe(expected);
      expect(JSON.stringify(payload)).not.toMatch(/\/p|GET|"x"/);
    });
  });

  it('fillPath refuses a missing param', () => {
    expect(() => fillPath('/a/{id}', {})).toThrow('missing path param "id"');
  });
});
