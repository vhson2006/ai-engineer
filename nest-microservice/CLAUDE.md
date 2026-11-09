# nest-microservice

NestJS 11 monorepo behind a **KrakenD** API gateway. Services expose **REST** for requests that need an answer and publish **NATS events** for facts other services react to. Services that store data use **Prisma + Postgres**, and each service owns its own database.

```
client ──Bearer token──▶ KrakenD :8080 ──HTTP + token──▶ deployment-service :3001 ──▶ Postgres
   │                     verify JWT + role             verify JWT + role + owner │
   └── login ──▶ Keycloak :8180  (JWKS public keys used by both verifiers)       └─NATS event──▶ notification-service
```

## Layout

| Path | What it is |
|---|---|
| `k8s/base/krakend/config/krakend.tmpl` (repo root) | The API gateway (KrakenD Flexible Configuration): the only HTTP entry to the services, PRIVATE (no Gateway route, no CORS; only portfolio-web's server calls it). Declares every route (`/api/...`) and the backend it forwards to. No code. Environment values (issuer, backends) are in `k8s/overlays/<env>/krakend/settings/env.json`. |
| `apps/deployment-service/` | REST service (`/api/deployments`, Swagger at `/docs`, `/health`, `/metrics`) + Prisma (`prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`). Publishes events over NATS. |
| `apps/deployment-service/src/files/` | Uploaded files: table `files` + object storage, presigned upload/download, attach to deployments, hourly cleanup. See README "Files". |
| `apps/notification-service/` | Event consumer: durable JetStream consumer + inbox (own database `notification`, table `inbox_messages`). HTTP only for `/health` and `/metrics`. |
| `apps/nats-setup/` | Not a service: creates/updates the JetStream streams (`STREAM_CONFIGS`) and exits. The ONE owner of the streams (ADR 0024): Job `nats-setup` in k8s, `npm run nats:setup` in dev (run first by `start:dev`). |
| `libs/common/` (`@app/common`) | Shared code: DTOs, response types, event subjects + classes, roles (`DEPLOYMENT_ROLES`), auth (`AuthModule`, `@Public`, `@Roles`, `@CurrentUser`), logging (`registerLogging`: pino JSON + access log), observability (`ObservabilityModule`: `/metrics`; `startTracing`: OpenTelemetry, ADR 0023), errors as RFC 9457 problems (`toProblem`, HTTP and RPC filters), `DatabaseError` + `databaseErrors()` Prisma extension, `HttpClient` for external APIs, object storage (`ObjectStorage`, `StorageModule`: S3 / Spaces / R2 / local S3), NATS client. |
| `k8s/` (repo root, shared with portfolio-web) | Kustomize: `base/` (Gateway, KrakenD, Keycloak), `components/` (`local-data` Postgres+Redis for dev, `nats`, `apps` = the 3 apps in the cluster), `overlays/dev/` (local values), `overlays/prod/` (DOKS via Argo CD: TLS, External Secrets, migration Job, NetworkPolicies), `platform/prod/` (cluster-level). Images: `Dockerfile` (`--target deployment-service|notification-service|migrate`). Local infrastructure on Kubernetes: KrakenD, Keycloak (realm `nest-microservice`, roles `deployment:read/write/admin`), Postgres, Redis, NATS, and the edge Gateway (NGINX Gateway Fabric: www/auth.localtest.me:8000; KrakenD is private, localhost:8080 via k8s:forward). No admin web UIs. See `k8s/README.md`. |

Reference implementation for every convention: the **deployments** feature (KrakenD endpoint → REST controller → service → `PrismaService`, plus the events).

## Commands

```bash
cp .env.example .env
npm install                 # also generates the Prisma client (postinstall)
# at the repo root first: npm run k8s:up (once), npm run k8s:forward (keep open: Postgres, Redis, NATS, KrakenD :8080, S3, Keycloak admin)
#   or with Docker instead: npm run infra:up   (never both at once)
npm run migration:run       # prisma migrate deploy
npm run migration:dev -- --name <change>   # after editing schema.prisma
npm run start:dev           # both apps in watch mode (or start:deployment / start:notification)
npm test                    # unit tests (*.spec.ts next to the code)
npm run test:e2e            # deployment-service REST e2e (Prisma + NATS mocked, no infra needed)
npm run lint:check && npm run format:check
npm run build
```

After editing `k8s/base/krakend/config/krakend.tmpl` (or a settings file), run `npm run krakend:check`, then `npm run k8s:up` (both at the repo root) (the pods roll automatically).

## Non-negotiables

1. **The API is private; only the web apps' servers call it.** Every route is declared in `k8s/base/krakend/config/krakend.tmpl` (a service route that isn't there can't be called), but KrakenD itself is NOT on the Internet: no `api.<domain>` route on the edge Gateway, no CORS, and in prod the NetworkPolicy `krakend-from-web` admits only `app: portfolio-web` (BFF: tokens never reach the browser). Public are only `www.*` (portfolio-web), `auth.*` (Keycloak, app realm + `/resources`; admin console and realm `master` via port-forward only) and object storage through presigned URLs. Never add an `api` route, KrakenD CORS or a public Service for KrakenD/services; a future external client (mobile app, partner) needs an explicit decision first.
2. **Public path = service path.** Services use the global prefix `api` (`/api/<resource>`), and KrakenD forwards to the same path with `no-op` encoding, so status codes, bodies and `Location` headers pass through unchanged. `/health` and `/metrics` stay outside the prefix and are never published.
3. **Business logic lives in the owning service, never in KrakenD.** KrakenD does routing, JWT/role checks, timeouts (and later rate limiting).
4. **Errors are thrown, never returned.** Services throw Nest `HttpException` subclasses (`NotFoundException`, `ConflictException`…); database and external-API failures are already typed (`DatabaseError`, `UpstreamError`). The global `HttpAllExceptionsFilter` answers every error as RFC 9457 Problem Details (`application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, `errors`). Anything else is a generic 500.
5. **REST semantics:** 201 + `Location` for create, 200 for read/update, 204 for delete. There's no response envelope: return the resource, or `{ data, meta }` for lists.
6. **A service owns its tables.** No other app connects to its database.
7. **Schema changes go through Prisma Migrate only**: edit `prisma/schema.prisma`, then commit the generated `prisma/migrations/<timestamp>_<name>/migration.sql`. Never `prisma db push` against a shared database.
8. **REST for requests that need an answer; NATS events (past tense, `DEPLOYMENT_EVENTS`) for facts other services may react to.** Events are **at-least-once** (ADR 0007): written with `addToOutbox(tx, …)` in the SAME transaction as the data, published by the outbox relay to JetStream, consumed by a durable consumer whose database work runs in `handleOnce` (inbox). Never `client.emit()` an event.
9. **Validate in the service:** KrakenD doesn't validate bodies. Each service has the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) and `ParseUUIDPipe` on ids. Event consumers validate event payload classes too.
10. **New logic needs unit tests, and new routes need e2e tests** (`apps/<service>/test/`) that assert status codes and headers, including 401 and 403.
11. **Every route is authenticated twice.** KrakenD's `auth/validator` (signature, `iss`, `aud`, role) and the service's global `AuthGuard` (same checks, local JWKS, no secret, no call to Keycloak per request). Every business route has `@Roles(...)` matching its KrakenD `roles`; only `/health` and `/metrics` are `@Public()`. Rules that depend on data (e.g. "only the creator or an admin may modify") live in the service, using `@CurrentUser()` and the `createdBy` column (Keycloak `sub`).
12. **Logs are JSON lines on stdout** (pino via `registerLogging(<service>)`, ready for Loki/Grafana): one access log line per request (`requestId`, `userId`, method, path without query, status, `durationMs`), and every other log of that request carries the same `requestId` (`X-Request-Id`, accepted from the caller or generated, echoed back). Use Nest's `Logger`, never `console.log`. Never log headers, tokens, query strings or bodies. `LOG_FORMAT=pretty` is for local reading only. Inside a traced request, logs also carry `trace_id`/`span_id`.
13. **Observability (ADR 0023):** every service imports `ObservabilityModule.forRoot('<name>-service')` (`GET /metrics`, scraped by Grafana Alloy) and starts tracing in `src/instrument.ts`, imported FIRST in `main.ts` (off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set). Metric labels and span attributes are low-cardinality and never hold ids, users, tokens or user input.

Path-scoped details load automatically from `.claude/rules/`. Skills: `/new-endpoint`, `/new-service`, `/security-review`. Review format: `docs/ai/code-review.md`. What may be pasted into AI tools: `docs/ai/ai-usage-policy.md` at the repo root.

**Monorepo** (ADR 0015): this package lives in `project/` next to `web/` and `k8s/`. The root `CLAUDE.md` has the system map and the cross-cutting rules; `k8s/...` paths below mean the root folder.

**Where things go:** see the root `CLAUDE.md`. Here: this package's instructions (`CLAUDE.md`, `.claude/rules/`, `.claude/skills/`) and `docs/ai/code-review.md`. Decisions: root `docs/adr/` (read the ADR before undoing a decision; a new decision gets an ADR in the same change).

## Keep this file true

If a convention changes, update this file and the matching `.claude/rules/*.md` in the same change. A rule that doesn't match the code is worse than no rule.
