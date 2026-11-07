import { describe, expect, it, vi } from 'vitest';

vi.mock('../server/redis', () => ({ redis: () => ({}) }));
vi.mock('../security/sealed', () => ({ hashedKey: (prefix: string, value: string) => `${prefix}${value}` }));

const { once } = await import('./idempotency');
type Store = NonNullable<Parameters<typeof once>[2]>['store'] & object;

function memoryStore() {
  const data = new Map<string, string>();
  const store: Store = {
    claim: async (key, value) => (data.has(key) ? false : (data.set(key, value), true)),
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
  };
  return { store, data };
}

describe('once (idempotent form submission)', () => {
  it('runs the action once; a resubmit with the same key gets the same result back', async () => {
    const { store } = memoryStore();
    const action = vi.fn(async () => ({ ok: true as const, data: { id: 'order-1' } }));

    const first = await once('order:u1:k1', action, { store });
    const second = await once('order:u1:k1', action, { store });

    expect(first).toEqual({ ok: true, data: { id: 'order-1' } });
    expect(second).toEqual(first);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('a double click while the first is still running → duplicate_submission, action not run twice', async () => {
    const { store } = memoryStore();
    let release!: () => void;
    const action = vi.fn(
      () => new Promise<{ ok: true; data: number }>((resolve) => (release = () => resolve({ ok: true, data: 1 }))),
    );

    const first = once('k', action, { store });
    await Promise.resolve(); // the first claimed the key
    const second = await once('k', action, { store });
    release();

    expect(second).toMatchObject({ ok: false, code: 'duplicate_submission' });
    expect(await first).toEqual({ ok: true, data: 1 });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('a failed result is not kept: fixing the input and submitting again runs the action', async () => {
    const { store, data } = memoryStore();
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'validation_error', message: 'x' })
      .mockResolvedValueOnce({ ok: true, data: 'done' });

    expect(await once('k', action, { store })).toMatchObject({ ok: false });
    expect(data.size).toBe(0);
    expect(await once('k', action, { store })).toEqual({ ok: true, data: 'done' });
  });

  it('an exception releases the key and propagates', async () => {
    const { store, data } = memoryStore();
    await expect(once('k', async () => Promise.reject(new Error('boom')), { store })).rejects.toThrow('boom');
    expect(data.size).toBe(0);
  });

  it('different scopes (users, keys) never collide', async () => {
    const { store } = memoryStore();
    const action = vi.fn(async () => ({ ok: true as const, data: 1 }));
    await once('order:alice:k', action, { store });
    await once('order:bob:k', action, { store });
    expect(action).toHaveBeenCalledTimes(2);
  });
});
