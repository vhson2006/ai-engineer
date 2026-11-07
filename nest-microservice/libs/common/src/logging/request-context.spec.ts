import type { IncomingMessage, ServerResponse } from 'node:http';
import { currentRequestId, requestContextMiddleware, runWithRequestId } from './request-context';

const req = (headers: Record<string, string> = {}) =>
  ({ headers: { ...headers } }) as unknown as IncomingMessage;
const res = (chosen?: string) => ({ getHeader: () => chosen }) as unknown as ServerResponse;

describe('[request-context] (unit)', () => {
  it('is empty outside a request', () => {
    expect(currentRequestId()).toBeUndefined();
  });

  it('runWithRequestId exposes the id to everything called inside, across awaits', async () => {
    await runWithRequestId('abc', async () => {
      await new Promise((r) => setTimeout(r, 1));
      expect(currentRequestId()).toBe('abc');
    });
  });

  it('after pino-http: reuses the id it already chose (response header)', () => {
    let seen: string | undefined;
    requestContextMiddleware(req(), res('pino-id'), () => (seen = currentRequestId()));
    expect(seen).toBe('pino-id');
  });

  it('before pino-http: keeps a safe caller id and writes it back for pino-http to reuse', () => {
    const request = req({ 'x-request-id': 'caller-1' });
    let seen: string | undefined;
    requestContextMiddleware(request, res(), () => (seen = currentRequestId()));
    expect(seen).toBe('caller-1');
    expect(request.headers['x-request-id']).toBe('caller-1');
  });

  it('replaces an unsafe caller id with a generated one', () => {
    const request = req({ 'x-request-id': 'bad id\nwith newline' });
    let seen: string | undefined;
    requestContextMiddleware(request, res(), () => (seen = currentRequestId()));
    expect(seen).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.headers['x-request-id']).toBe(seen);
  });
});
