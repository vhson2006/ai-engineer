import { IncomingMessage, ServerResponse } from 'node:http';
import { accessLogOptions, pathOf, requestIdFrom } from './access-log';

describe('[access-log] (unit)', () => {
  const options = accessLogOptions({ service: 'test-service', level: 'info', format: 'json' });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  const req = (over: Record<string, unknown> = {}) =>
    ({
      method: 'GET',
      url: '/api/deployments',
      headers: {},
      ...over,
    }) as unknown as IncomingMessage;
  const res = (statusCode = 200) => {
    const headers: Record<string, string> = {};
    return {
      statusCode,
      headers,
      setHeader: (name: string, value: string) => (headers[name] = value),
    } as unknown as ServerResponse & { headers: Record<string, string> };
  };

  describe('requestIdFrom', () => {
    it('keeps a safe caller id', () => {
      expect(requestIdFrom('next-7f3a.42:abc_1')).toBe('next-7f3a.42:abc_1');
    });

    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['too long', 'a'.repeat(129)],
      ['with spaces / injection', 'abc\n{"level":"fatal"}'],
      ['repeated header (array)', ['a', 'b']],
    ])('generates a UUID when the header is %s', (_case, header) => {
      expect(requestIdFrom(header)).toMatch(UUID);
    });
  });

  it('pathOf drops the query string', () => {
    expect(pathOf('/api/deployments?search=secret&page=2')).toBe('/api/deployments');
    expect(pathOf(undefined)).toBe('/');
  });

  it('genReqId echoes the id in the X-Request-Id response header', () => {
    const response = res();
    const id = options.genReqId!(req({ headers: { 'x-request-id': 'abc-123' } }), response);
    expect(id).toBe('abc-123');
    expect(response.headers['X-Request-Id']).toBe('abc-123');
  });

  it('adds userId only once the caller is authenticated', () => {
    const customProps = options.customProps as (r: IncomingMessage, s: ServerResponse) => object;
    expect(customProps(req(), res())).toEqual({});
    expect(customProps(req({ user: { id: 'user-1', roles: [] } }), res())).toEqual({
      userId: 'user-1',
    });
  });

  it('does not access-log /health, with or without a query', () => {
    const { ignore } = options.autoLogging as { ignore: (r: IncomingMessage) => boolean };
    expect(ignore(req({ url: '/health' }))).toBe(true);
    expect(ignore(req({ url: '/health?probe=1' }))).toBe(true);
    expect(ignore(req({ url: '/api/deployments' }))).toBe(false);
  });

  it.each([
    [200, 'info'],
    [201, 'info'],
    [401, 'warn'],
    [404, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ])('logs status %i at level %s', (status, level) => {
    expect(options.customLogLevel!(req(), res(status), undefined)).toBe(level);
  });

  it('serializes the request without headers or query (no tokens, no cookies, no search terms)', () => {
    const serialized = options.serializers!.req({
      method: 'POST',
      url: '/api/deployments?search=x',
      headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
    });
    expect(serialized).toEqual({ method: 'POST', path: '/api/deployments' });
    expect(JSON.stringify(serialized)).not.toContain('secret');
  });

  it('builds a one-line message: method, path without query, status, duration', () => {
    const message = (
      options.customSuccessMessage as (r: IncomingMessage, s: ServerResponse, ms: number) => string
    )(req({ method: 'POST', url: '/api/deployments?x=1' }), res(201), 18);
    expect(message).toBe('POST /api/deployments 201 18ms');
  });

  it('uses Loki-friendly keys and labels', () => {
    expect(options.customAttributeKeys).toEqual({ reqId: 'requestId', responseTime: 'durationMs' });
    expect(options.base).toMatchObject({ service: 'test-service' });
    expect(options.formatters!.level!('info', 30)).toEqual({ level: 'info' });
    expect(options.transport).toBeUndefined(); // json → plain stdout, no worker thread
  });

  it('uses pino-pretty only when the format is pretty', () => {
    const pretty = accessLogOptions({ service: 's', level: 'info', format: 'pretty' });
    expect(pretty.transport).toMatchObject({ target: 'pino-pretty' });
  });
});
