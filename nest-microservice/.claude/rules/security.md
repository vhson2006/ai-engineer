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

Exposure (private API, what is public): root `.claude/rules/infrastructure.md`, ADR 0003.

## Tokens (ADR 0002)
- Keycloak RS256 access tokens verified locally by KrakenD and by each REST service
  (`AuthModule` → global `AuthGuard`): signature via JWKS, `iss`, `aud`, `exp`; only RS256. No
  shared secret, no call to Keycloak per request.
- A token stays valid until it expires (5 min) even if the user loses a role: keep
  `accessTokenLifespan` short; use introspection only where revocation must be instant.
- Services never trust identity headers: they re-verify the forwarded `Authorization`. 401
  messages are generic; the reason is logged at debug level only.

## Config and secrets
- Every env var is validated with Joi in the root module and listed in `.env.example` with a
  dummy value. `.env` is git-ignored: never commit it, never hardcode a secret.
- Never log secrets, tokens, full connection strings or bodies. The access log keeps method, path
  **without query**, status, duration, `requestId`, `userId`; keep its serializer and `redact`.
- A caller's `X-Request-Id` is accepted only if it matches `^[A-Za-z0-9._:-]{1,128}$`.

## Input and output
- `whitelist` + `forbidNonWhitelisted` in every REST service, `ParseUUIDPipe` on ids, bounded
  pagination (`MAX_PAGE_SIZE`) and strings (`@MaxLength`). KrakenD forwards only listed params and headers.
- Only parameterized queries (Prisma, tagged `$queryRaw`); never `$queryRawUnsafe` with user
  input. Escape `%`/`_` when a `LIKE` pattern must be literal.
- 5xx never carry stacks, SQL or hostnames (`toProblem`); responses list fields explicitly.
