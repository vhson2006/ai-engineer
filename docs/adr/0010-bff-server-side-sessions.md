# 0010. BFF: tokens stay on the server, the browser holds a session id

- **Status:** Accepted
- **Date:** 2026-11-05 (recorded 2026-11-06)
- **Related:** `portfolio-web/.claude/rules/auth.md`, portfolio-web README "How authentication works",
  ADR 0002 (token verification) and 0003 (private API)

## Context

The site has a signed-in area that calls the API with the user's Keycloak token. Tokens kept in
the browser (localStorage, readable cookies, JS memory of an SPA) are stolen by any XSS, and an
API callable from the browser must be public with CORS.

## Decision

- Next.js is a **Backend for Frontend**: Authorization Code + PKCE with a confidential client
  (`web`), code exchange on the server.
- The browser gets only an **httpOnly, SameSite=Lax cookie with a random session id**
  (`__Host-` + Secure in production).
- Access, refresh and id tokens live in **Redis**, sealed with AES-256-GCM
  (`SESSION_ENCRYPTION_KEY`, key name as AAD) under `web:session:<sha256(session id)>`, as the
  least-privilege ACL user `web` (keys `web:*`, GET/SET/DEL/GETDEL/INCR/EXPIRE/PING).
- Only the server calls the API (`apiFetch`), which lets the API be private (ADR 0003).

## Consequences

- XSS can't read tokens; a Redis dump or RedisInsight can't either (sealed, hashed keys).
- Every signed-in render needs Redis; Redis down → friendly "unavailable", not a crash.
- Mutations are same-site POSTs with a cookie: CSRF must be handled (0004).
- Rotating `SESSION_ENCRYPTION_KEY` signs everybody out.

## Alternatives considered

- **SPA with tokens in the browser (PKCE public client)**: XSS steals tokens; API must be public. Rejected.
- **Stateless encrypted cookie holding the tokens**: large cookies, no server-side revocation,
  refresh races between tabs. Rejected for Redis sessions.
- **Our own login form + password grant**: removed in OAuth 2.1, the app would handle passwords. Rejected.
