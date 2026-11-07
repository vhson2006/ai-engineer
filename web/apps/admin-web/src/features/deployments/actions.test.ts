import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createDeployment: vi.fn() }));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/cache', () => cache);
// once() with an in-memory store (no Redis): the real implementation, deterministic.
const memory = vi.hoisted(() => new Map<string, string>());
vi.mock('@web/core/actions/idempotency', async (importOriginal) => {
  const real = await importOriginal<typeof import('@web/core/actions/idempotency')>();
  const store = {
    claim: async (key: string, value: string) => (memory.has(key) ? false : (memory.set(key, value), true)),
    get: async (key: string) => memory.get(key) ?? null,
    set: async (key: string, value: string) => void memory.set(key, value),
    del: async (key: string) => void memory.delete(key),
  };
  return { ...real, once: (scope: string, action: () => Promise<unknown>) => real.once(scope, action as never, { store }) };
});

const { createDeploymentAction } = await import('./actions');

const valid = {
  submissionId: '7d1f6a52-3c1e-4c2a-9f5e-0b6a3f1d2e4c',
  name: ' checkout-api ',
  version: '1.4.0',
  environment: 'staging',
  description: 'First release',
};
const created = { ok: true, data: { id: 'd-1', name: 'checkout-api' } };

beforeEach(() => {
  vi.resetAllMocks();
  memory.clear();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Alice', username: 'alice', roles: [] });
  api.createDeployment.mockResolvedValue(created);
});

describe('createDeploymentAction', () => {
  it('creates with exactly the validated fields (trimmed, no extra keys) and refreshes the page', async () => {
    const result = await createDeploymentAction({ ...valid, ownerId: 'someone-else', status: 'succeeded' });

    expect(result).toEqual({ ok: true, data: { id: 'd-1', name: 'checkout-api' } });
    expect(api.createDeployment).toHaveBeenCalledWith({
      name: 'checkout-api',
      version: '1.4.0',
      environment: 'staging',
      description: 'First release',
    });
    expect(cache.refresh).toHaveBeenCalledOnce();
  });

  it('sends no description when it is empty', async () => {
    await createDeploymentAction({ ...valid, description: '   ' });
    expect(api.createDeployment).toHaveBeenCalledWith(expect.not.objectContaining({ description: expect.anything() }));
  });

  it.each([
    ['empty name', { ...valid, name: '  ' }, 'name', 'required'],
    ['long name', { ...valid, name: 'a'.repeat(101) }, 'name', 'tooLong'],
    ['bad version', { ...valid, version: 'v1' }, 'version', 'invalidVersion'],
    ['unknown environment', { ...valid, environment: 'qa' }, 'environment', 'invalid'],
    ['long description', { ...valid, description: 'a'.repeat(2001) }, 'description', 'tooLong'],
    ['bad submission id', { ...valid, submissionId: 'x' }, 'submissionId', 'invalid'],
    ['name as a number', { ...valid, name: 42 }, 'name', 'required'],
  ])('refuses %s without calling the API', async (_case, input, field, message) => {
    const result = await createDeploymentAction(input);
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(!result.ok && result.errors).toContainEqual({ field, message });
    expect(api.createDeployment).not.toHaveBeenCalled();
  });

  it('refuses a non-object input', async () => {
    expect(await createDeploymentAction(null)).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(api.createDeployment).not.toHaveBeenCalled();
  });

  it('refuses when signed out, without calling the API', async () => {
    session.getSessionUser.mockResolvedValue(null);
    expect(await createDeploymentAction(valid)).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(api.createDeployment).not.toHaveBeenCalled();
  });

  it('stops when rate limited, before anything else', async () => {
    limit.limitAction.mockResolvedValue({ ok: false, code: 'rate_limited', message: 'Slow down', retryAfterS: 30 });
    expect(await createDeploymentAction(valid)).toMatchObject({ ok: false, code: 'rate_limited', retryAfterS: 30 });
    expect(session.getSessionUser).not.toHaveBeenCalled();
    expect(api.createDeployment).not.toHaveBeenCalled();
  });

  it('maps an API failure to code, message, field errors and request id only', async () => {
    api.createDeployment.mockResolvedValue({
      ok: false,
      status: 409,
      code: 'conflict',
      message: 'A deployment with this name and version already exists',
      errors: undefined,
      requestId: 'req-9',
      problem: { detail: 'internal', stack: 'x' },
    });
    expect(await createDeploymentAction(valid)).toEqual({
      ok: false,
      code: 'conflict',
      message: 'A deployment with this name and version already exists',
      errors: undefined,
      requestId: 'req-9',
    });
    expect(cache.refresh).not.toHaveBeenCalled();
  });

  it('calls the API once for the same submission id (double submit)', async () => {
    const [first, second] = [await createDeploymentAction(valid), await createDeploymentAction(valid)];
    expect(second).toEqual(first);
    expect(api.createDeployment).toHaveBeenCalledOnce();
  });

  it('lets the user retry after a failure (the submission is not remembered)', async () => {
    api.createDeployment.mockResolvedValueOnce({ ok: false, status: 503, code: 'unavailable', message: 'x', requestId: 'r' });
    await createDeploymentAction(valid);
    expect(await createDeploymentAction(valid)).toEqual({ ok: true, data: { id: 'd-1', name: 'checkout-api' } });
    expect(api.createDeployment).toHaveBeenCalledTimes(2);
  });
});
