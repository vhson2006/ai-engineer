# 0002. Keycloak OIDC, RS256 tokens verified locally by KrakenD and by each service

- **Status:** Accepted
- **Date:** 2026-11-05 (recorded 2026-11-06)
- **Related:** 0025 (several realms, so several issuers), root `CLAUDE.md` non-negotiable 3, `nest-microservice/CLAUDE.md` non-negotiable 2, `nest-microservice/.claude/rules/security.md`, ADR 0010

## Context

Users sign in once and act on several services. Roles (`deployment:read/write/admin`) and data
rules ("only the creator or an admin may modify") must be enforced, without a call to the identity
server on every request and without trusting identity headers set by another component.

## Decision

- **Keycloak** (realm `nest-microservice`) issues RS256 access tokens with the client roles of
  `deployments-api` and audience `deployments-api`. Access token lifetime 5 minutes.
- **KrakenD** verifies every token (signature via JWKS, `iss`, `aud`, `exp`, role per endpoint)
  through the shared `endpoint.tmpl`.
- **Each service verifies it again** (global `AuthGuard`, local JWKS, `@Roles` matching the
  KrakenD roles). Only `/health` is `@Public()`. The caller's id comes only from `@CurrentUser()`
  (token `sub`), never from the body, query or a header.
- Data rules (ownership) live in the service.

## Consequences

- Defence in depth: a misconfigured KrakenD route or a request that bypasses it still needs a
  valid token with the right role.
- A token stays valid until it expires (≤ 5 min) even if the user is disabled; operations that
  need instant revocation must use token introspection.
- Roles are declared in three places that must agree: the realm, KrakenD endpoint roles, `@Roles`.

## Alternatives considered

- **Verify only at the gateway, trust headers in services**: one misroute = full bypass. Rejected.
- **Introspection on every request**: latency and load on Keycloak for every call. Rejected as default.
- **HS256 shared secret**: every verifier could mint tokens. Rejected; RS256 only.
