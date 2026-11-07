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

KrakenD is the only HTTP entry to the services, and it is PRIVATE: only the web apps' servers (portfolio-web, admin-web)
calls it (no Gateway route, no CORS). It routes; it has no business logic. Its config is a
**Flexible Configuration** template, written once for every environment:

| File | Holds |
|---|---|
| `k8s/base/krakend/config/krakend.tmpl` | Every public endpoint (same in all environments) |
| `k8s/base/krakend/config/templates/endpoint.tmpl` | The security of one endpoint, written once: Keycloak token check + rate limits |
| `k8s/overlays/<env>/krakend/settings/env.json` | Environment values: `auth.issuer`, `auth.jwk_url`, `auth.jwk_over_plain_http`, `auth.audience`, `services.<name>` (backend URLs), `ratelimit.read` / `ratelimit.write` (`max_rate`, `client_max_rate`, `every`), `log_level` |

Both k8s (three hash-suffixed ConfigMaps) and `docker-compose.yml` (bind mounts of the same
folders, dev settings) use these files.

## Endpoints (in `krakend.tmpl`)
- One endpoint object per method + path. Public path = backend path: `"endpoint": "/api/deployments/{id}"` → `"url_pattern": "/api/deployments/{id}"`.
- Always `"output_encoding": "no-op"` on the endpoint and `"encoding": "no-op"` on the backend, so status codes (201/204/4xx), bodies and headers (`Location`) pass through unchanged.
- KrakenD forwards **nothing** it isn't told to: list every query param in `input_query_strings`, and every request header in `input_headers` (`Content-Type` for POST/PATCH/PUT). A missing entry is silently dropped.
- Never use `"*"` for `input_query_strings`/`input_headers` and never proxy a whole path prefix. An explicit list keeps internal routes (`/health`, `/metrics`, `/docs`) private.
- **Every endpoint uses the shared `endpoint.tmpl`** (token check + rate limits). Only the roles and the limit class differ; roles must match the route's `@Roles(...)` in the service, the limit is `"read"` for GET and `"write"` for everything that changes state:
  `"extra_config": {{ template "endpoint.tmpl" (dict "env" .env "roles" (list "deployment:write" "deployment:admin") "limit" "write") }}`
  Never inline an `auth/validator` or a `qos/ratelimit/router`: issuer, JWKS URL, audience and limits must stay identical by construction. An endpoint without them needs an explicit decision and a comment.
- Backend host comes from the settings, per backend: `"host": [{{ marshal .env.services.deployment }}]`. A new service adds `services.<name>` to **every** overlay's `env.json`.
- Values from settings are written with `marshal` (proper JSON quoting), never pasted inside quotes.
- Conditional updates (PATCH/PUT with optimistic concurrency) also forward `If-Match` in `input_headers`.
- Forward `Authorization` and `X-Request-Id` in `input_headers` on every endpoint: the service verifies the token again, and uses the request id to correlate its logs (it echoes it back in the response).
- `auth.jwk_over_plain_http: true` (→ `disable_jwk_security`) is allowed only when `jwk_url` is the **in-cluster** Keycloak Service (dev and prod both do this; in prod the NetworkPolicy limits who reaches Keycloak). A JWKS URL that leaves the cluster must be HTTPS with `false`.

## Cross-cutting
- **KrakenD is private.** No route on the edge Gateway (`k8s/base/gateway/routes.yaml`), no `api.<domain>`, no CORS: browsers never call it, only the web apps' servers (portfolio-web, admin-web) (BFF). In prod the NetworkPolicy `krakend-from-web` admits only `app: portfolio-web`. Keep JWT + role checks anyway (defence in depth: a compromised web pod still needs a user's token). A future external client (mobile app, partner) needs an explicit decision: its own route and auth, not a reopened `api` host.
- The global `timeout` bounds every request. A backend that doesn't answer in time gives a KrakenD error while the service may still finish, so handlers should be idempotent.
- **Rate limits** (ADR 0017) come from `endpoint.tmpl`: `max_rate` per endpoint (protects the service) and `client_max_rate` per access token, `strategy: header`, `key: Authorization` (= per user session). Never per IP: the only caller is the web app's pod. Over the limit → 429 with an empty body, no `Retry-After`; the web app's `apiFetch` retries GETs with backoff. Counters are per KrakenD replica. Change the numbers in `settings/env.json`, not in endpoints. No rate limiting in the services (`@nestjs/throttler`): it would duplicate this and miscount across replicas.
- KrakenD CE **follows backend redirects** (`no_redirect` is Enterprise only): a 3xx from a service never reaches the client, KrakenD fetches the target itself. Never answer 3xx to make a client go somewhere (file downloads): return the URL as JSON and let the client redirect (see `/api/files/{id}/download-url`).
- 401 (no/invalid token) and 403 (missing role) are answered by KrakenD itself, in microseconds, without calling the service.

## Change workflow
1. Validate: `npm run krakend:check` (renders the template with the dev settings in the real image; `bash k8s/scripts/krakend-check.sh <overlay>` for another overlay). Read `k8s/.krakend-rendered.<overlay>.json` if in doubt.
2. Apply: `npm run k8s:up` (new ConfigMap hashes → pods roll). With docker compose: `docker compose restart krakend`.
3. Check the route through KrakenD at `http://localhost:8080` (`npm run k8s:forward`): status code + headers, not only directly on the service.

## Kubernetes gotchas (already handled in `k8s/base/krakend/deployment.yaml`)
- `enableServiceLinks: false`: otherwise Kubernetes injects `KRAKEND_PORT=tcp://...` from the `krakend` Service, KrakenD reads it as a config override, and fails to start.
- The image runs as root by default. The pod runs it as the image's `krakend` user (UID 1000).
- Flexible Configuration renders to a temp file: `/tmp` is an `emptyDir` because the root filesystem is read-only. Without it: `open /tmp/KrakenD_parsed_config_template_…: read-only file system`.
