# 0017. Rate limits, security headers, compression, CORS: each at the layer that sees the threat

- **Status:** Accepted, partly implemented
- **Date:** 2026-11-06
- **Related:** ADR 0003 (private API), 0004 (Keycloak), 0016 (CSP), `.claude/rules/krakend.md`,
  `k8s/base/krakend/config/templates/endpoint.tmpl`

## Context

The usual Express hardening (helmet, compression, cors, express-rate-limit) assumes the server
faces browsers. Here only two things face the Internet: the edge (→ the web app and Keycloak) and
object storage. KrakenD and the services are private and only see the web app's server (ADR 0003),
so per-IP limits there would count one IP (the web pod), browser headers would protect nothing, and
CORS would only open a door.

## Decision

| Concern | Where | Not where |
|---|---|---|
| **Rate limits** | Edge: per client IP (prod, follow-up). Keycloak: brute-force detection on both realms. Web app: `/auth/login` per client IP (10 / 5 min), Server Actions per user (upload 30 / 5 min, other mutations 60 / 5 min), Redis fixed windows, fail open. KrakenD: per endpoint (`max_rate`) and per access token (`client_max_rate`, header `Authorization`) via `endpoint.tmpl` | Services (`@nestjs/throttler`): duplicates KrakenD, miscounts across replicas |
| **Security headers** | Web app (CSP etc., ADR 0016); HSTS at the edge | Services and KrakenD: they answer JSON to a server, not to a browser (`helmet` optional, low value) |
| **Compression** | Between browser and web app: `next start` gzip, or the edge/CDN in prod | Web app → KrakenD → services: small JSON inside the cluster; costs CPU both ends |
| **CORS** | Object storage only (`APP_URL`, PUT + Content-Type) | Web app (same origin), KrakenD and services (private) |

KrakenD limits (settings `ratelimit`): read 200/s per endpoint, 20/s per token; write 50/s and
5/s. Over the limit → 429 (empty body, no `Retry-After`); `apiFetch` retries GETs with backoff.

## Consequences

- Verified: 40 concurrent GETs with one token → 20 × 200, 20 × 429; 10 concurrent writes → 5 reach
  the service, 5 × 429; another user isn't affected. 5 wrong passwords lock a Keycloak account
  temporarily (same error message as a wrong password).
- KrakenD counters are per replica: with N replicas the effective limit is up to N times higher.
- Web app (`lib/security/rate-limit.ts`, `lib/actions/limit.ts`): the client IP is `X-Real-IP`,
  set by the edge (only the edge reaches the app in prod). Verified: the 11th `/auth/login` in
  5 min from one IP → `/login?error=rate_limited` with `Retry-After`; another IP isn't affected.
  The Redis `web` ACL user got `+incr +expire`. In dev every request through the Gateway has the
  same (Docker) IP, so the login limit applies to the whole machine.
- Prod: enable PROXY protocol on the cloud load balancer (and real-IP handling in the edge), or
  every client gets the LB's IP and shares one login budget.
- Still to do: an edge limit in prod (check NGINX Gateway Fabric support, or Cloudflare),
  Keycloak forwarded headers (it currently sees the edge's IP).

## Alternatives considered

- **helmet + compression + cors + throttler in every Nest service**: protects against nothing
  that reaches them, adds CPU, and CORS would contradict ADR 0003. Rejected.
- **Per-IP limits in KrakenD**: every request comes from the web pod. Rejected.
