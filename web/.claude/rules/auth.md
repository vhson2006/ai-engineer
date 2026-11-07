---
paths:
  - 'apps/*/src/app/auth/**'
  - 'apps/*/.env.example'
  - 'packages/core/src/auth/**'
  - 'packages/core/src/security/**'
  - 'packages/core/src/server/**'
  - 'apps/*/src/proxy.ts'
---

# Sessions, tokens and Keycloak

Architecture and the full flow: portfolio-web README "How authentication works". Rules:

- **The auth Route Handlers are shared**: `/auth/login`, `/auth/callback`, `/auth/logout` are one
  line each in an app (`createLoginRoute` / `createCallbackRoute` / `createLogoutRoute` from
  `@web/core/auth/routes`). Change the flow there, once, never in one app.
- **App differences come from env, not code**: `KEYCLOAK_CLIENT_ID`, `REDIS_KEY_PREFIX`
  (`web:` / `admin-web:`), `KEYCLOAK_REQUIRED_ROLE` (admin-web: `admin-web:admin`, checked at
  sign-in and on every refresh; a refused sign-in also ends the Keycloak session).

- **Tokens never leave the server.** The browser holds only the httpOnly session-id cookie.
  Access, refresh and id tokens live in Redis, sealed (AES-256-GCM, `seal()`), under a hashed key
  (`hashedKey()`), never the raw session id. Same for anything else secret (PKCE verifier).
- **Never log tokens or token-request errors as objects** (they can contain tokens): log the
  error name, code and message only (see `describe()` in `packages/core/src/auth/token-refresh.ts`).
- **Refresh**: only `refreshSession()` (single-flight: React `cache()` per request + Redis lock
  per session). Only `invalid_grant` ends a session; a network error, timeout or 5xx from Keycloak
  keeps it (`unavailable` → API calls answer 503 `auth_unavailable`). Never sign the user out
  yourself on a failed refresh. Refresh-token rotation is on in the realm: a second, unlocked
  refresh path would sign users out at random.
- **Each app has its own Redis ACL user and key prefix** (`web` → `web:*`, `admin-web` →
  `admin-web:*`); build every key with `redisKeyPrefix()`, never a literal prefix. Commands
  GET/SET/DEL/GETDEL/INCR/EXPIRE/PING only (no Lua,
  no INFO, no KEYS). Design new Redis usage within that (SET NX EX for locks/once, GET+compare
  then DEL to unlock, INCR + EXPIRE for rate-limit counters). Redis down → a friendly
  `/login?error=session_unavailable`, never a bare 500 and never blamed on Keycloak
  (`unavailable` is for Keycloak). Use only `redis()` (`packages/core/src/server/redis.ts`): command timeout,
  endless reconnect and a PING health check that replaces a half-open client; never create
  another client or call Redis without handling the error.
- **Keycloak calls** go through `oidcConfig()` (`openid-client`, 5 s timeout, stays below the
  10 s refresh lock). The issuer is the public `KEYCLOAK_ISSUER`; tokens are checked against it.
- **Redirects** are built with `appUrl()` (from `APP_URL`), never from `request.url` (behind the
  Gateway that is the internal address). `returnTo` only through `safeReturnTo()` (relative paths
  only, no open redirect). Logout is a POST.
- **Rate limits** (ADR 0017): `/auth/login` per client IP (`rateLimit(LIMITS.login, clientIp(...))`),
  Server Actions per user (`limitAction`, see forms.md). The client IP is `X-Real-IP` set by the
  edge (`clientIp()`); never trust `X-Forwarded-For`'s first entry. Limits fail open.
- **Cookies** only via `packages/core/src/auth/cookies.ts` (`__Host-` + Secure in production, `clearCookie()`).
- Tests: `npm test` (`token-refresh.test.ts`: concurrency with rotation, invalid_grant vs
  temporary errors, waiter timeout).
