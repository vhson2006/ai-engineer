import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import * as client from 'openid-client';
import { cache } from 'react';
import { oidcConfig } from './oidc';
import { redisKeyPrefix, requiredRole } from '../server/env';
import { redis } from '../server/redis';
import { hashedKey, seal, unseal } from '../security/sealed';
import { SESSION_COOKIE } from './cookies';
import {
  AuthUnavailableError,
  DEFAULT_REFRESH_OPTIONS,
  isFresh,
  refreshSession,
  type RefreshDeps,
  type RefreshOutcome,
  type SessionStore,
} from './token-refresh';

/**
 * Backend-for-frontend session.
 *
 * The browser only holds an opaque, httpOnly cookie with a random session id. The Keycloak
 * tokens (access ~1.2KB + refresh + id token: too big for a cookie) stay in Redis, on the server.
 * Server Components call the API with the access token; the browser never sees it.
 *
 * In Redis, the key is a hash of the session id and the value is encrypted (lib/security/sealed.ts):
 * reading Redis is not enough to reuse anyone's session.
 *
 * Token refresh (lib/auth/token-refresh.ts): once per request (React cache), once across concurrent
 * requests / tabs / replicas (Redis lock), and only `invalid_grant` signs the user out.
 */
const KEY = (id: string) => hashedKey(`${redisKeyPrefix()}session:`, id);
const LOCK_KEY = (id: string) => hashedKey(`${redisKeyPrefix()}session-refresh:`, id);
/** Refresh the access token when it expires within this many seconds. */
const REFRESH_SKEW_S = DEFAULT_REFRESH_OPTIONS.skewS;

export interface SessionUser {
  id: string; // Keycloak `sub`
  name: string;
  username: string;
  email?: string;
  roles: string[]; // client roles of deployments-api
  /** Client roles per client (`resource_access`), e.g. { 'admin-web': ['admin'], 'content-api': [...] }. */
  clientRoles?: Record<string, string[]>;
  /** Keycloak group paths (`groups` claim), e.g. '/sites/nails'. Absent in sessions created before. */
  groups?: string[];
}

interface StoredSession {
  user: SessionUser;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number; // epoch seconds of the access token
  refreshExpiresAt?: number; // epoch seconds of the refresh token (Keycloak refresh_expires_in)
  /** The latest token carries KEYCLOAK_REQUIRED_ROLE (always true when none is required). */
  allowed: boolean;
}

/**
 * Called by /auth/callback after a successful code exchange. Returns the new session id, or null
 * when the user lacks the app's required role (KEYCLOAK_REQUIRED_ROLE): no session is created.
 */
export async function createSession(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): Promise<string | null> {
  const data = toStored(tokens);
  if (!data.allowed) return null;
  const id = randomBytes(32).toString('base64url');
  await save(id, data);
  return id;
}

/**
 * The signed-in user, or null. Refreshes the access token transparently when needed.
 * If Keycloak is temporarily unreachable, the user is still returned (we know who they are; the
 * session isn't over): only calls that need a valid token fail, see getAccessToken().
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const outcome = await loadCurrent();
  return outcome.kind === 'ended' ? null : outcome.data.user;
}

/**
 * A valid access token for calling the API, or null when signed out / the session ended.
 * Throws AuthUnavailableError when the token has expired and Keycloak can't renew it right now
 * (apiFetch turns that into a 503 "try again", instead of signing the user out).
 */
export async function getAccessToken(): Promise<string | null> {
  return tokenOf(await loadCurrent());
}

/**
 * The API rejected `rejected` with 401 (revoked early, clock skew...): get a NEW token, once.
 * Concurrent callers share one refresh. Same results as getAccessToken().
 */
export async function renewAccessToken(rejected: string): Promise<string | null> {
  const id = await currentSessionId();
  if (!id) return null;
  return tokenOf(await refreshSession(redisStore(id), refreshDeps, { rejectedToken: rejected }));
}

/** Removes the session from Redis. Returns the id token for Keycloak's logout (id_token_hint). */
export async function destroySession(id: string): Promise<string | undefined> {
  const raw = await redis().getdel(KEY(id));
  return raw ? (unseal<StoredSession>(raw, KEY(id))?.idToken ?? undefined) : undefined;
}

function tokenOf(outcome: RefreshOutcome<StoredSession>): string | null {
  if (outcome.kind === 'ended') return null;
  if (outcome.kind === 'unavailable') {
    // Refresh failed for a temporary reason. A token that is still valid (we refresh 30 s
    // early) can be used; an expired one can't.
    if (outcome.data.expiresAt <= now()) throw new AuthUnavailableError();
  }
  return outcome.data.accessToken;
}

/**
 * The current request's session, loaded (and refreshed if needed) ONCE per request: the header,
 * the page and every API call of one render share this result (React cache; in Route Handlers
 * it isn't memoized, which is fine: they call it once).
 */
const loadCurrent = cache(async (): Promise<RefreshOutcome<StoredSession>> => {
  const id = await currentSessionId();
  if (!id) return { kind: 'ended' };

  const store = redisStore(id);
  const data = await store.get();
  if (!data) return { kind: 'ended' }; // expired, logged out, tampered or another key
  if (isFresh(data, now(), REFRESH_SKEW_S)) return gate(store, { kind: 'fresh', data });

  if (!data.refreshToken) {
    await store.remove();
    return { kind: 'ended' };
  }
  return gate(store, await refreshSession(store, refreshDeps, { skewS: REFRESH_SKEW_S }));
});

/**
 * The required role is re-checked on every refreshed token: removing it in Keycloak ends the
 * session within one access-token lifetime, without waiting for the SSO session to expire.
 */
async function gate(
  store: SessionStore<StoredSession>,
  outcome: RefreshOutcome<StoredSession>,
): Promise<RefreshOutcome<StoredSession>> {
  if (outcome.kind === 'ended' || outcome.data.allowed) return outcome;
  await store.remove();
  return { kind: 'ended' };
}

async function currentSessionId(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

const refreshDeps: RefreshDeps<StoredSession> = {
  async refresh(current) {
    if (!current.refreshToken) throw new SessionEndedError();
    const tokens = await client.refreshTokenGrant(await oidcConfig(), current.refreshToken);
    return toStored(tokens, current);
  },
  // invalid_grant: refresh token expired, revoked (logout elsewhere, rotation reuse), user
  // disabled, SSO idle/max timeout. Anything else (network, timeout, 5xx, invalid_client) is not
  // the user's fault and must not sign them out.
  isSessionEnded: (error) =>
    error instanceof SessionEndedError ||
    (error instanceof client.ResponseBodyError && error.error === 'invalid_grant'),
};

class SessionEndedError extends Error {}

/** One session in Redis (sealed value under a hashed key) + its refresh lock. */
function redisStore(id: string): SessionStore<StoredSession> {
  const key = KEY(id);
  const lockKey = LOCK_KEY(id);
  return {
    async get() {
      const raw = await redis().get(key);
      return raw ? unseal<StoredSession>(raw, key) : null;
    },
    save: (data) => save(id, data),
    async remove() {
      await redis().del(key);
    },
    async tryLock(token, ttlMs) {
      return (await redis().set(lockKey, token, 'PX', ttlMs, 'NX')) === 'OK';
    },
    async unlock(token) {
      // Compare-then-delete. Not atomic (the "web" ACL user can't run Lua), but the window is
      // tiny and the lock has a TTL anyway.
      if ((await redis().get(lockKey)) === token) await redis().del(lockKey);
    },
  };
}

async function save(id: string, data: StoredSession): Promise<void> {
  // Keep the session exactly as long as the refresh token lives (Keycloak's SSO idle timeout).
  const ttl = Math.max(60, (data.refreshExpiresAt ?? data.expiresAt) - now());
  await redis().set(KEY(id), seal(data, KEY(id)), 'EX', ttl);
}

function toStored(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  previous?: StoredSession,
): StoredSession {
  const access = decodePayload(tokens.access_token);
  const idClaims = tokens.claims();
  const resourceAccess = access.resource_access as Record<string, { roles?: string[] }> | undefined;
  const roles = resourceAccess?.['deployments-api']?.roles;
  const required = requiredRole();
  const allowed = !required || (resourceAccess?.[required.client]?.roles ?? []).includes(required.role);

  return {
    user: {
      id: String(access.sub ?? idClaims?.sub ?? previous?.user.id),
      name: String(idClaims?.name ?? access.name ?? access.preferred_username ?? 'User'),
      username: String(access.preferred_username ?? idClaims?.preferred_username ?? ''),
      email: (access.email ?? idClaims?.email) as string | undefined,
      roles: Array.isArray(roles) ? roles : [],
      clientRoles: Object.fromEntries(
        Object.entries(resourceAccess ?? {}).map(([client, value]) => [
          client,
          Array.isArray(value?.roles) ? value.roles.map(String) : [],
        ]),
      ),
      groups: Array.isArray(access.groups) ? access.groups.map(String) : [],
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    idToken: tokens.id_token ?? previous?.idToken,
    expiresAt: now() + (tokens.expiresIn() ?? 60),
    refreshExpiresAt:
      typeof tokens.refresh_expires_in === 'number'
        ? now() + tokens.refresh_expires_in
        : previous?.refreshExpiresAt,
    allowed,
  };
}

/**
 * Reads claims WITHOUT verifying the signature. Safe here only because the token comes straight
 * from Keycloak's token endpoint over the back channel; it's used for display (name, roles).
 * The API verifies every token it receives.
 */
function decodePayload(jwt: string): Record<string, unknown> {
  const part = jwt.split('.')[1];
  return part ? (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>) : {};
}

const now = () => Math.floor(Date.now() / 1000);
