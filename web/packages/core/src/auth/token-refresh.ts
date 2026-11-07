import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * Single-flight refresh of a server-side session's access token.
 *
 * Problem: one page renders several Server Components in parallel (header + page + API calls),
 * the user may have several tabs, and production runs several Next.js replicas. When the access
 * token expires, each of them would send the SAME refresh token to Keycloak at the same time.
 * With refresh-token rotation, only the first succeeds; the others get `invalid_grant` and the
 * user would be signed out in the middle of a page.
 *
 * Solution: a short lock per session in Redis (SET NX PX). The holder refreshes and saves; the
 * others wait for the saved result and reuse it. Inside the lock the session is read again, so a
 * refresh finished by someone else just before is never repeated.
 *
 * Errors: only `invalid_grant` (refresh token expired or revoked: logout elsewhere, user
 * disabled, idle timeout) ends the session. Network errors, timeouts and 5xx from Keycloak are
 * temporary: the session is kept, the caller decides (see session.ts).
 *
 * Pure logic, no Redis/Next imports: unit tested with an in-memory store.
 */

export interface TokenState {
  accessToken: string;
  /** Epoch seconds when the access token expires. */
  expiresAt: number;
}

/** Storage of ONE session, plus its refresh lock. */
export interface SessionStore<T> {
  get(): Promise<T | null>;
  save(data: T): Promise<void>;
  remove(): Promise<void>;
  /** Takes the lock if free (SET key token NX PX ttl). */
  tryLock(token: string, ttlMs: number): Promise<boolean>;
  /** Releases the lock only if we still own it. */
  unlock(token: string): Promise<void>;
}

export interface RefreshDeps<T> {
  /** Calls the token endpoint with the session's refresh token and returns the new session. */
  refresh(current: T): Promise<T>;
  /** True when the error means "this session is over" (OAuth invalid_grant). */
  isSessionEnded(error: unknown): boolean;
  now?: () => number; // epoch seconds
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string, error?: unknown) => void;
}

export interface RefreshOptions {
  /** Refresh when the token expires within this many seconds. */
  skewS?: number;
  /** Lock lifetime: longer than one refresh call (Keycloak timeout is 5 s). */
  lockTtlMs?: number;
  /** How long a waiter waits for another refresh to finish. */
  waitMs?: number;
  pollMs?: number;
  /**
   * An access token the API just rejected (401). The session counts as fresh only with a
   * DIFFERENT token, so a refresh is forced even if `expiresAt` says it's still valid.
   */
  rejectedToken?: string;
}

export type RefreshOutcome<T> =
  | { kind: 'fresh'; data: T }
  /** The session is over (or gone): treat as signed out. */
  | { kind: 'ended' }
  /** Keycloak is unreachable or too slow: the session is kept, `data` is the latest known. */
  | { kind: 'unavailable'; data: T };

export const DEFAULT_REFRESH_OPTIONS = {
  skewS: 30,
  lockTtlMs: 10_000,
  waitMs: 6_000,
  pollMs: 100,
} as const;

/** True when the token doesn't need a refresh yet. */
export function isFresh<T extends TokenState>(
  data: T,
  now: number,
  skewS: number = DEFAULT_REFRESH_OPTIONS.skewS,
  rejectedToken?: string,
): boolean {
  return data.accessToken !== rejectedToken && data.expiresAt - skewS > now;
}

/**
 * Returns a session with a fresh access token, refreshing it at most once across every
 * concurrent caller of the same session.
 */
export async function refreshSession<T extends TokenState>(
  store: SessionStore<T>,
  deps: RefreshDeps<T>,
  options: RefreshOptions = {},
): Promise<RefreshOutcome<T>> {
  const { skewS, lockTtlMs, waitMs, pollMs } = { ...DEFAULT_REFRESH_OPTIONS, ...options };
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log ?? ((message, error) => console.error(message, describe(error)));
  const fresh = (data: T) => isFresh(data, now(), skewS, options.rejectedToken);

  const lockToken = randomBytes(16).toString('base64url');
  const deadline = Date.now() + waitMs;

  for (;;) {
    if (await store.tryLock(lockToken, lockTtlMs)) {
      try {
        // Someone may have refreshed it between our read and our lock.
        const latest = await store.get();
        if (!latest) return { kind: 'ended' };
        if (fresh(latest)) return { kind: 'fresh', data: latest };

        try {
          const next = await deps.refresh(latest);
          await store.save(next);
          return { kind: 'fresh', data: next };
        } catch (error) {
          if (deps.isSessionEnded(error)) {
            await store.remove();
            return { kind: 'ended' };
          }
          log('[auth] token refresh failed (temporary, session kept):', error);
          return { kind: 'unavailable', data: latest };
        }
      } finally {
        await store.unlock(lockToken).catch(() => undefined); // expires by itself anyway
      }
    }

    // Another request is refreshing this session: wait for its result.
    await sleep(pollMs);
    const latest = await store.get();
    if (!latest) return { kind: 'ended' };
    if (fresh(latest)) return { kind: 'fresh', data: latest };
    if (Date.now() >= deadline) {
      log('[auth] gave up waiting for a concurrent token refresh');
      return { kind: 'unavailable', data: latest };
    }
    // Lock still held (keep waiting), or released after a temporary failure: we try ourselves.
  }
}

/** The error message only: never log the error object of a token request (it may hold tokens). */
function describe(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown; error?: unknown }).error ?? (error as { code?: unknown }).code;
    return code ? `${error.name} ${String(code)}: ${error.message}` : `${error.name}: ${error.message}`;
  }
  return error === undefined ? '' : String(error);
}

/** Keycloak is unreachable and the access token has expired: the page should say "try again". */
export class AuthUnavailableError extends Error {
  constructor() {
    super('The sign-in service is temporarily unavailable');
    this.name = 'AuthUnavailableError';
  }
}
