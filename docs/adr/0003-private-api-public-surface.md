# 0003. The API is private: only the web app's server calls it

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** 0019 (adds the admin site admin.* to the public surface), 0027 (adds `hooks.*` for signed platform webhooks), root `CLAUDE.md` non-negotiable 1, `.claude/rules/krakend.md`, `.claude/rules/infrastructure.md`,
  `k8s/base/gateway/routes.yaml`, `k8s/overlays/prod/networkpolicies.yaml`, ADR 0010

## Context

KrakenD was published as `api.<domain>` with CORS, although its only real client is the web app,
a BFF that calls the API from its server with the user's token (ADR 0010). A public
API is attack surface (scanning, brute force on tokens, abuse of every endpoint) with no user for it.

## Decision

- **Public** (edge Gateway): `www.*` (portfolio-web), `auth.*` (Keycloak, app realm + `/resources`
  only, see 0004), and object storage through presigned URLs / CDN (see 0006). Nothing else.
- **Private**: KrakenD (no `api` HTTPRoute, no CORS), the services, NATS, databases.
- Prod NetworkPolicy `krakend-from-web` admits only pods `app: portfolio-web` to KrakenD :8080,
  so even an `api` route added by mistake couldn't reach it.
- JWT and role checks stay in KrakenD and the services (0002): a compromised web pod still needs
  a user's token.
- Dev mirrors prod: the web app and curl reach KrakenD at `localhost:8080` through
  `npm run k8s:forward`; `api.localtest.me` answers 404.

## Consequences

- Browsers never call the API, so no CORS anywhere; uploads/downloads go to storage directly.
- Testing by hand needs the port-forward (`localhost:8080`), not a public URL.
- No `api` DNS record or certificate in prod.
- A future external client (mobile app, partner) needs a new, explicit decision: its own route,
  authentication and limits, not reopening `api.<domain>`.

## Alternatives considered

- **Keep `api.<domain>` public with CORS restricted to the web origin**: CORS doesn't stop
  non-browser clients; the surface stays. Rejected.
- **Proxy file bytes through the web app to avoid a public storage endpoint**: memory, bandwidth
  and body limits for no security gain (presigned URLs are scoped and short-lived). Rejected (0006).
