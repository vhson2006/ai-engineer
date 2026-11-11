# nest-microservice

NestJS 11 monorepo template: **KrakenD** API gateway + REST microservices + **NATS** events + **Prisma/Postgres**.

```
browser ──▶ portfolio-web (Next.js server) ──HTTP──▶ KrakenD :8080 ──HTTP──▶ deployment-service :3001 ──▶ Postgres
                                               (/api/..., PRIVATE)                    │
                                                                                      └─NATS event──▶ notification-service
```

KrakenD and the services are **not public**: no Gateway route, no CORS. Only the web apps' servers
calls the API; browsers talk to the web app, Keycloak (login) and object storage (presigned URLs).

## Requirements
- Node.js 20 LTS or newer
- A local Kubernetes cluster (e.g. Docker Desktop) **or** Docker for docker compose

## Quick start
```bash
# at the repo root (infrastructure, details: ../k8s/README.md):
#   npm run k8s:up         KrakenD, Keycloak, Postgres, Redis, NATS, S3
#   npm run k8s:forward    Postgres/Redis/NATS/KrakenD/S3/Keycloak admin on localhost; keep it open
cp .env.example .env
npm install
# or, with Docker instead of Kubernetes: npm run infra:up

npm run migration:run     # prisma migrate deploy
npm run start:dev         # nats:setup (JetStream streams, ADR 0024), then deployment-service :3001, notification-service :3002, content-service :3003
npm run seed:article-templates   # optional: the 10 laundry article templates (ADR 0033), published, vi + en
```

Then get a token from Keycloak and call the API **through KrakenD** (`localhost:8080`, from `k8s:forward`):

```bash
TOKEN=$(curl -s http://auth.localtest.me:8000/realms/nest-microservice/protocol/openid-connect/token \
  -d grant_type=password -d client_id=dev-cli -d username=bob -d password=password | jq -r .access_token)

curl -i -X POST http://localhost:8080/api/deployments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"checkout-api","version":"1.0.0","environment":"production"}'
# → 201 Created, Location: /api/deployments/<id>
# notification-service logs: "Deployment checkout-api@1.0.0 created ... by user <bob's id>"
```

Articles of the client sites (content-service, ADR 0026), same pattern. bob writes drafts for the
site `nails` (group `/sites/nails`); alice (`content:admin`, every site) creates the sites and
publishes. alice has OTP: add `-d totp=<code>` (dev secret in `../web/apps/admin-web/README.md`).

```bash
curl -i -X POST http://localhost:8080/api/content/sites -H "Authorization: Bearer $ALICE" \
  -H "Content-Type: application/json" -d '{"id":"nails","name":"Envy Nails","locales":["en","vi"],"defaultLocale":"en"}'
# categories: POST /api/content/sites/nails/categories   articles: POST /api/content/sites/nails/articles
# publish now or later (every language required): POST .../articles/<id>/publish  {"at": "<ISO>"}
# what a site shows: GET /api/content/sites/nails/published-articles?locale=vi[&category=<slug>]
#                    GET /api/content/sites/nails/published-articles/by-slug?locale=vi&slug=<slug>
```

Updates are plain PATCHes (JSON merge); the last write wins, there is no version check
(ADR 0029):

```bash
curl -i -X PATCH http://localhost:8080/api/deployments/<id>   -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"   -d '{"status":"running"}'
# → 200 with the deployment
```

Test users (password `password`): `carol` can read, `bob` can also create and change his own
deployments, `alice` (admin) can change anyone's. No token → 401, missing role → 403.

| URL | What |
|---|---|
| http://localhost:8080/api/deployments | The API (KrakenD, private: port-forward only, like prod) |
| http://www.localtest.me:8000 | portfolio-web (Next.js on your machine, through the Gateway) |
| http://localhost:8080/__health | KrakenD health |
| http://localhost:3001/docs | Swagger of deployment-service (direct, dev only; "Authorize" with a token) |
| http://localhost:8180/admin | Keycloak Admin Console (`admin` / `admin`), private: port-forward only. Fresh cluster: run `npm run keycloak:admin-url` once at the repo root |
| http://localhost:3001/health, http://localhost:3002/health | Service health checks |
| http://localhost:3001/metrics, http://localhost:3002/metrics | Prometheus metrics (scraped by Grafana Alloy in the cluster, ADR 0023) |

## Logs
Every service writes **JSON lines** to stdout (pino), ready for Loki/Grafana. One access log line per
request, and every log of that request shares its `requestId` (the `X-Request-Id` header, sent by
the caller or generated, and returned in the response):

```json
{"level":"info","time":"2026-11-05T09:16:45.741Z","service":"deployment-service","requestId":"via-krakend-7",
 "userId":"626cc0e3-…","req":{"method":"GET","path":"/api/deployments"},"res":{"statusCode":200},
 "durationMs":12,"msg":"GET /api/deployments 200 12ms"}
```

`LOG_FORMAT=pretty` (default in `.env.example`) prints the same logs readably for local dev;
use `json` anywhere logs are collected. `LOG_LEVEL` defaults to `info`.

## Metrics and traces
Grafana Cloud, fed by Grafana Alloy in the cluster (ADR 0023). Nothing to set up locally:

- **Metrics** are always on: `GET /metrics` on each service's port (Prometheus text). HTTP latency
  and status by route template (`http_server_request_duration_seconds`), outbox publishes and
  failures (`messaging_outbox_*`), consumer outcomes ack / retry / dlq (`messaging_consumer_*`),
  Node.js process metrics. Never published in KrakenD.
- **Traces** (OpenTelemetry) are off until `OTEL_EXPORTER_OTLP_ENDPOINT` is set (the cluster sets
  it to Alloy). Then a request from the web app through KrakenD continues the same trace here,
  down to the SQL queries, and log lines written inside it carry `trace_id` / `span_id`.
  `OTEL_TRACES_SAMPLER_ARG` (0..1) keeps a share of new traces; `OTEL_RESOURCE_ATTRIBUTES` adds
  e.g. `deployment.environment.name=prod`.

## Tests
```bash
npm test            # unit tests
npm run test:integration  # REST tests per service (test/integration/; Prisma + NATS mocked, no infrastructure)
```

## Files (uploads)

The bytes never go through KrakenD or the services: browsers upload to and download from object
storage with **presigned URLs**; the API only signs URLs and keeps metadata (table `files`).

```
1. POST /api/files/uploads { purpose, filename, contentType, size }
     → 201 { file (pending), upload: { method: "PUT", url, headers, expiresAt } }
2. PUT upload.url with upload.headers and the bytes       (straight to S3 / Spaces / R2)
3. POST /api/files/{id}/complete → 200 file (uploaded, url)  (the server checks size + type)
4. POST /api/deployments { ..., attachmentIds: [id] }        (attached in the same transaction)
   GET /api/files/{id} → a fresh url · GET /api/files?deploymentId= · DELETE /api/files/{id}
5. GET /api/files/{id}/download-url?disposition=attachment|inline → { url, expiresAt, filename, ... }
```

**Downloading**: browsers follow `/files/<id>/download` on portfolio-web. That route asks the API
for the link with the user's session and answers **302** to it, so the bytes come straight from
storage. The API never redirects itself: KrakenD CE follows backend redirects and would stream the
file through the gateway.

| Purpose (`FILE_PURPOSES`) | Bucket | Types | Max | URL |
|---|---|---|---|---|
| `deployment-attachment` | private | pdf, txt, csv, json, zip, png, jpeg, webp | 20 MiB | presigned, 5 min, `Content-Disposition: attachment` |
| `public-image` | public | png, jpeg, webp, gif, avif | 5 MiB | stable CDN URL |

- The **server** picks bucket, key (`<purpose>/<yyyy>/<mm>/<id>.<ext>`) and limits from the purpose;
  Content-Type and Content-Length are signed into the upload URL and verified again on completion.
- Private files: visible to their owner, admins, and every reader once attached to a live
  deployment; anyone else gets 404. Public files: any reader, through the CDN.
- Abandoned uploads and attachments never attached are deleted after 24 h (hourly job).
- Provider: `STORAGE_PROVIDER=spaces | s3 | r2 | custom` (`libs/common/src/storage`). Dev uses
  SeaweedFS in the cluster on http://localhost:8333 (`npm run k8s:forward` at the repo root).

## How a request flows
1. **KrakenD** matches the public route in `k8s/base/krakend/config/krakend.tmpl`, verifies the Keycloak token (signature with the realm's public keys, issuer, audience, role) and forwards the request unchanged (`no-op`) to `deployment-service` on the same path. Bad token → 401, missing role → 403, the service isn't called.
2. The **service** verifies the token again (`AuthGuard`, roles via `@Roles`), validates the input (`ValidationPipe`), applies ownership rules, writes the deployment AND the event `events.deployment.created` (outbox row) in one Postgres transaction, and answers `201` + `Location`. The outbox relay publishes the event to JetStream right after (or as soon as NATS is back).
3. Any error (a thrown `NotFoundException`, a validation failure, a unique-index violation, the database being down...) becomes an RFC 9457 problem (`application/problem+json`) with the right status, a stable `code` and the `requestId`; KrakenD passes it through. KrakenD's own 401/403 (token rejected at the gateway) have an empty body: clients rely on the status code there.
4. **notification-service** receives it from its durable JetStream consumer, records the message id in its inbox and reacts, in one transaction (at-least-once delivery, processed once; ADR 0007).

## Adding a public route
1. Add the route to the service controller (under the `/api` prefix) with `@Roles(...)` and an integration test (including 401/403).
2. Add a matching endpoint to `k8s/base/krakend/config/krakend.tmpl` (repo root) (same path, `no-op` encoding, the shared `endpoint.tmpl` with the same roles, list query strings and headers to forward, including `Authorization`).
3. At the repo root: `npm run krakend:check`, then `npm run k8s:up` to roll KrakenD with the new config.
4. If the web app calls it: a typed helper in `web/packages/core/src/api/<resource>.ts`.

Conventions for humans and AI agents: [CLAUDE.md](CLAUDE.md).
