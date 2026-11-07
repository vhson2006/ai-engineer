import { describe, expect, it, vi } from 'vitest';

vi.mock('../server/redis', () => ({ redis: () => ({}) }));
vi.mock('./sealed', () => ({ hashedKey: (prefix: string, value: string) => `${prefix}${value}` }));

const { clientIp, rateLimit } = await import('./rate-limit');
type Store = NonNullable<NonNullable<Parameters<typeof rateLimit>[2]>['store']>;

function memoryStore() {
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  const store: Store = {
    incr: async (key) => {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    expire: async (key, s) => void ttls.set(key, s),
  };
  return { store, counts, ttls };
}

const policy = { name: 'test', limit: 3, windowS: 60 };
const T0 = Date.UTC(2026, 10, 6, 12, 0, 10); // 10 s into a minute

describe('rateLimit (fixed window)', () => {
  it('allows `limit` requests per window, then refuses with the seconds left', async () => {
    const { store, ttls } = memoryStore();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(policy, 'ip:1.2.3.4', { store, now: T0 }));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
    expect(results[3].retryAfterS).toBe(50);
    expect([...ttls.values()]).toEqual([61]); // EXPIRE once, on the first hit
  });

  it('a new window starts a new count; subjects are counted separately', async () => {
    const { store } = memoryStore();
    for (let i = 0; i < 3; i++) await rateLimit(policy, 'user:a', { store, now: T0 });
    expect((await rateLimit(policy, 'user:a', { store, now: T0 })).allowed).toBe(false);
    expect((await rateLimit(policy, 'user:b', { store, now: T0 })).allowed).toBe(true);
    expect((await rateLimit(policy, 'user:a', { store, now: T0 + 60_000 })).allowed).toBe(true);
  });

  it('keys hold no raw subject (hashed) and the policy name', async () => {
    const { store, counts } = memoryStore();
    await rateLimit(policy, 'ip:1.2.3.4', { store, now: T0 });
    expect([...counts.keys()][0]).toMatch(/^web:rl:test:/) // default REDIS_KEY_PREFIX;
  });

  it('fails OPEN when Redis is down (never takes the site down)', async () => {
    const broken: Store = { incr: async () => Promise.reject(new Error('ECONNREFUSED')), expire: async () => undefined };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await rateLimit(policy, 'x', { store: broken, now: T0 })).toMatchObject({ allowed: true });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('clientIp', () => {
  it('X-Real-IP set by the edge wins over anything else', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '6.6.6.6' }))).toBe('203.0.113.7');
  });
  it('else the LAST X-Forwarded-For hop (the one our proxy appended), not a spoofable first one', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }))).toBe('203.0.113.7');
  });
  it('no proxy header (direct dev access) → "direct"', () => {
    expect(clientIp(new Headers())).toBe('direct');
  });
});
