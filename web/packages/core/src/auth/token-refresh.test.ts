import { describe, expect, it, vi } from 'vitest';
import { refreshSession, type SessionStore, type TokenState } from './token-refresh';

interface Session extends TokenState {
  refreshToken: string;
}

const NOW = 1_000_000;

/** In-memory SessionStore with Redis-like lock semantics; can simulate concurrent processes. */
function memoryStore(initial: Session | null) {
  const state = { data: initial, lock: null as string | null, saves: 0 };
  const store: SessionStore<Session> = {
    get: async () => (state.data ? { ...state.data } : null),
    save: async (data) => {
      state.data = { ...data };
      state.saves++;
    },
    remove: async () => {
      state.data = null;
    },
    tryLock: async (token) => {
      if (state.lock) return false;
      state.lock = token;
      return true;
    },
    unlock: async (token) => {
      if (state.lock === token) state.lock = null;
    },
  };
  return { store, state };
}

const expired: Session = { accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: NOW - 1 };

/** Keycloak with refresh-token ROTATION: each refresh token works exactly once. */
function rotatingKeycloak() {
  const used = new Set<string>();
  let n = 1;
  const refresh = vi.fn(async (s: Session): Promise<Session> => {
    await new Promise((r) => setTimeout(r, 20)); // network latency: lets callers overlap
    if (used.has(s.refreshToken)) throw Object.assign(new Error('Token is not active'), { error: 'invalid_grant' });
    used.add(s.refreshToken);
    n++;
    return { accessToken: `at-${n}`, refreshToken: `rt-${n}`, expiresAt: NOW + 300 };
  });
  return { refresh };
}

const isInvalidGrant = (e: unknown) => (e as { error?: string }).error === 'invalid_grant';
const deps = (refresh: (s: Session) => Promise<Session>) => ({
  refresh,
  isSessionEnded: isInvalidGrant,
  now: () => NOW,
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  log: () => undefined,
});

describe('refreshSession', () => {
  it('refreshes an expired session and saves it', async () => {
    const { store, state } = memoryStore(expired);
    const { refresh } = rotatingKeycloak();

    const outcome = await refreshSession(store, deps(refresh), { pollMs: 5 });

    expect(outcome).toEqual({ kind: 'fresh', data: { accessToken: 'at-2', refreshToken: 'rt-2', expiresAt: NOW + 300 } });
    expect(state.data?.accessToken).toBe('at-2');
    expect(state.lock).toBeNull();
  });

  it('5 concurrent callers (header + page + API calls + 2 tabs) → ONE refresh, nobody signed out, even with rotation', async () => {
    const { store, state } = memoryStore(expired);
    const { refresh } = rotatingKeycloak();

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () => refreshSession(store, deps(refresh), { pollMs: 5 })),
    );

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(state.saves).toBe(1);
    for (const outcome of outcomes) {
      expect(outcome).toMatchObject({ kind: 'fresh', data: { accessToken: 'at-2' } });
    }
  });

  it('does not refresh again when someone else refreshed between our read and our lock', async () => {
    const { store, state } = memoryStore({ ...expired, accessToken: 'at-9', expiresAt: NOW + 300 });
    const refresh = vi.fn();

    const outcome = await refreshSession(store, deps(refresh), { pollMs: 5 });

    expect(outcome).toMatchObject({ kind: 'fresh', data: { accessToken: 'at-9' } });
    expect(refresh).not.toHaveBeenCalled();
    expect(state.saves).toBe(0);
  });

  it('invalid_grant (expired / revoked refresh token) ends the session', async () => {
    const { store, state } = memoryStore(expired);
    const refresh = vi.fn(async () => {
      throw Object.assign(new Error('Session not active'), { error: 'invalid_grant' });
    });

    expect(await refreshSession(store, deps(refresh), { pollMs: 5 })).toEqual({ kind: 'ended' });
    expect(state.data).toBeNull();
    expect(state.lock).toBeNull();
  });

  it('a network error / timeout / 5xx from Keycloak KEEPS the session (unavailable, not signed out)', async () => {
    const { store, state } = memoryStore(expired);
    const refresh = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    const outcome = await refreshSession(store, deps(refresh), { pollMs: 5 });

    expect(outcome).toEqual({ kind: 'unavailable', data: expired });
    expect(state.data).toEqual(expired);
    expect(state.lock).toBeNull();
  });

  it('a waiter gives up after waitMs when the refresh holder hangs (unavailable, session kept)', async () => {
    const { store, state } = memoryStore(expired);
    state.lock = 'someone-else'; // another replica holds the lock and never finishes

    const outcome = await refreshSession(store, deps(vi.fn()), { pollMs: 5, waitMs: 50 });

    expect(outcome).toEqual({ kind: 'unavailable', data: expired });
    expect(state.data).toEqual(expired);
  });

  it('rejectedToken forces a refresh even when expiresAt says the token is still valid (API answered 401)', async () => {
    const valid: Session = { accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: NOW + 200 };
    const { store } = memoryStore(valid);
    const { refresh } = rotatingKeycloak();

    const outcome = await refreshSession(store, deps(refresh), { pollMs: 5, rejectedToken: 'at-1' });

    expect(outcome).toMatchObject({ kind: 'fresh', data: { accessToken: 'at-2' } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a session deleted meanwhile (logout in another tab) → ended', async () => {
    const { store } = memoryStore(null);
    expect(await refreshSession(store, deps(vi.fn()), { pollMs: 5 })).toEqual({ kind: 'ended' });
  });
});
