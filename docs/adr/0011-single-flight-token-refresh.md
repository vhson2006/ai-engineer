# 0011. Token refresh: single-flight with a Redis lock; only `invalid_grant` signs out

- **Status:** Accepted
- **Date:** 2026-11-06 (recorded)
- **Related:** `portfolio-web/src/lib/auth/token-refresh.ts`, `portfolio-web/src/lib/auth/session.ts`, `portfolio-web/.claude/rules/auth.md`

## Context

One page renders several Server Components in parallel (header, page, API calls); users have
several tabs; production runs several replicas. When the access token expired, each of them sent
the same refresh token to Keycloak. With refresh-token rotation (a used refresh token is revoked,
reuse is detected as theft) all but one would get `invalid_grant` and the user would be signed
out mid-page. And any refresh error (Keycloak slow or restarting) signed the user out.

## Decision

- Refresh 30 s before expiry, **once per request** (React `cache()`) and **once per session
  across requests, tabs and replicas**: a 10 s lock in Redis (`SET NX PX`); the holder re-reads
  the session (someone may have just refreshed), refreshes and saves; the others poll for the
  saved result (up to 6 s). Unlock = GET + compare + DEL (the `web` ACL user can't run Lua).
- **Only `invalid_grant` ends the session** (logged out elsewhere, revoked, idle/max timeout,
  user disabled). Network errors, timeouts and 5xx keep it: the still-valid token is used, or
  API calls answer 503 `auth_unavailable` while the user stays signed in.
- Keycloak calls time out after 5 s (below the lock TTL).
- Refresh-token **rotation is enabled** in the realm (`revokeRefreshToken`, max reuse 0).

## Consequences

- Verified: 5 concurrent refreshes with rotation → 1 call to Keycloak, nobody signed out; live, 6
  concurrent dashboard loads stayed signed in; Keycloak unreachable → "temporarily unavailable"
  instead of a logout.
- A stolen refresh token that is used after the legitimate one is detected by Keycloak.
- Any new code path that refreshes tokens must go through `refreshSession()`, or users get signed
  out at random.

## Alternatives considered

- **Refresh without coordination**: breaks with rotation. Rejected.
- **Disable rotation**: a stolen refresh token stays usable until it expires. Rejected.
- **Sign out on any refresh error**: logs everyone out during a Keycloak restart. Rejected.
