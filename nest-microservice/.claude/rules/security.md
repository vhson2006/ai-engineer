---
paths:
  - 'apps/*/src/main.ts'
  - 'apps/*/src/setup.ts'
  - 'apps/*/src/*.module.ts'
  - '**/*.guard.ts'
  - 'docker-compose.yml'
  - '.env.example'
---

# Security rules

## Current state (be honest about it)
- **Authentication is Keycloak (OIDC) with RS256 access tokens**, verified locally (public keys from the realm's JWKS, no shared secret, no call to Keycloak per request) by KrakenD (`auth/validator`) and again by each REST service (`AuthModule` → global `AuthGuard`). Only RS256 is accepted; `iss`, `aud` and `exp` are always checked.
- Consequence of local verification: a token stays valid until it expires (5 minutes) even if the user is disabled or loses a role. Keep `accessTokenLifespan` short; use token introspection only for operations that need instant revocation.
- Infrastructure security (what is public, Keycloak admin, Redis ACL users, NATS credentials, dev credentials): `/.claude/rules/infrastructure.md` at the repo root.

## Boundaries
- The API is private (only the web apps' servers (portfolio-web, admin-web) call KrakenD; see the root `infrastructure.md` and ADR 0003). A service route exists only if it is declared in `k8s/base/krakend/config/krakend.tmpl` (repo root). Keep the JWT + role checks in the service anyway (defence in depth).
- KrakenD doesn't validate bodies. Services validate every input (global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`) and every event payload.
- Services never trust identity headers: they re-verify the `Authorization` token KrakenD forwards. The caller's id comes only from `@CurrentUser()`, never from the body, query or a custom header.
- 401 messages are generic (`Invalid or expired token`); the reason is logged at debug level only.

## Config and secrets
- Every env var is validated with Joi in the app module's `ConfigModule.forRoot({ validationSchema })` and listed in `.env.example` with a dummy value.
- Never hardcode secrets, and never log them, full connection strings, tokens or whole request bodies. The access log (`libs/common/src/logging/access-log.ts`) records only method, path **without query**, status, duration, `requestId` and `userId`; headers are dropped by its serializer and by `redact`. Keep it that way: Loki/Grafana users must not be able to read tokens or user input from logs.
- A caller-supplied `X-Request-Id` is accepted only if it matches `^[A-Za-z0-9._:-]{1,128}$`; otherwise a UUID is generated (no log injection).
- `.env` is git-ignored. Never commit it.

## Errors and data exposure
- 5xx responses never include stack traces, SQL or internal hostnames (`toProblem` returns a generic 500 `internal_error`).
- Response contracts list fields explicitly (`toResponse`). Never return a raw Prisma row.

## Input and queries
- `ParseUUIDPipe` on ids. `whitelist` + `forbidNonWhitelisted` in every REST service. KrakenD forwards only the query params and headers it lists.
- Only parameterized queries (Prisma Client, or tagged-template `$queryRaw`; never `$queryRawUnsafe` with user input). Escape `%`/`_` if a `LIKE` pattern must be literal.
- Bound pagination (`MAX_PAGE_SIZE`) and string lengths (`@MaxLength`).
