---
paths:
  - 'k8s/base/krakend/**'
  - 'k8s/overlays/*/krakend/**'
  - 'k8s/base/gateway/**'
  - 'k8s/overlays/*/patches/gateway.yaml'
  - 'k8s/overlays/*/networkpolicies.yaml'
  - 'k8s/scripts/port-forward.*'
---

# KrakenD (API gateway) rules

KrakenD routes, checks tokens and rate-limits; no business logic. It is private (exposure rules:
`infrastructure.md`). Flexible Configuration, one template for every environment:

| File | Holds |
|---|---|
| `k8s/base/krakend/config/krakend.tmpl` | Every endpoint |
| `k8s/base/krakend/config/templates/endpoint.tmpl` | One endpoint's security: token check + rate limits |
| `k8s/overlays/<env>/krakend/settings/env.json` | `auth.*` (issuer, JWKS, default audience), `services.<name>`, `ratelimit.read/write`, `log_level` |

## Endpoints
- One object per method + path; public path = backend path; `"output_encoding": "no-op"` and
  backend `"encoding": "no-op"` (status codes, bodies, `Location` pass unchanged).
- Forward nothing implicitly: list every query param (`input_query_strings`) and header
  (`input_headers`: `Authorization`, `X-Request-Id`, plus `Content-Type` on POST/PATCH/PUT).
  Never `"*"`, never a whole path prefix (keeps `/health`, `/metrics`, `/docs` private).
- Always `"extra_config": {{ template "endpoint.tmpl" (dict "env" .env "roles" (list …) "limit" "read|write") }}`;
  roles = the route's `@Roles`; `read` for GET, `write` otherwise. A service with its own
  Keycloak resource server adds `"audience" "<client>"` (e.g. content-service: `content-api`).
  Never inline an `auth/validator` or a rate limit.
- Backends: `"host": [{{ marshal .env.services.<name> }}]`; a new service adds `services.<name>`
  to EVERY overlay's `env.json`. Settings values always through `marshal`.
- No endpoint forwards `If-Match` (ADR 0029). `jwk_over_plain_http: true` only for the in-cluster Keycloak.

## Behaviour to design around
- The global `timeout` (5 s) can expire while the service completes: handlers should be idempotent.
- Rate limits (ADR 0017) per endpoint and per access token, never per IP; 429 has an empty body.
  Numbers live in `env.json`. No rate limiting in the services.
- KrakenD CE follows backend redirects: never answer 3xx to send a client somewhere; return the URL as JSON.
- KrakenD answers 401/403 itself (empty body) before calling the service.

## Workflow
1. `npm run krakend:check` (`bash k8s/scripts/krakend-check.sh <overlay>` for another overlay;
   output in `k8s/.krakend-rendered.<overlay>.json`).
2. `npm run k8s:up` (new ConfigMap hashes roll the pods).
3. Call the route through `http://localhost:8080` (`npm run k8s:forward`): status and headers.

Kubernetes gotchas already handled in `k8s/base/krakend/deployment.yaml`: `enableServiceLinks: false`,
non-root UID 1000, `/tmp` emptyDir for the rendered template.
