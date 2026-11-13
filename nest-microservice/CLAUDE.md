# nest-microservice

NestJS 11 monorepo behind KrakenD. Services answer **REST** requests and publish **NATS events**
for facts others react to; each service owns its Prisma + Postgres database. The root `CLAUDE.md`
has the system map and the system non-negotiables (private API, tokens checked twice…); paths
here are relative to this package, except `k8s/...` and `docs/adr/...` (root folders).

| Path | What |
|---|---|
| `apps/deployment-service/` | REST `/api/deployments`, `/api/files` (presigned uploads, hourly cleanup), port 3001. The reference implementation of every convention. |
| `apps/content-service/` | REST `/api/content/sites/{siteId}/...` (ADR 0026), port 3003: one module per resource (`sites/` exports the site rule, `categories/`, `articles/` with publishing + scheduler, `published-articles/`, `media/`: per-site image library in the public bucket, ADR 0034, + AI images and their monthly quota, ADR 0037, `translations/`: machine-translation jobs through ai-service, ADR 0036; `ai-results/`: the one consumer of ai-service's and render-worker's answers; `studio/`: video studio, brand kit, avatars, projects, ADR 0039), `common/`. Own audience `content-api` (`src/env.ts`), site rule from `/sites/<id>` groups (ADR 0028). |
| `apps/ai-service/` | Event consumer + outbox (ADR 0036): the ONLY caller of AI providers (Gemini now, keys in `ai-providers`); machine translation of text segments; image generation, optimized with sharp and written to `media/` (ADR 0037); video scripts, drafts of a video's input fields (reading its images) and text to speech (WAVs to `studio/`, ADR 0039); HTTP only `/health`, `/metrics` (:3004). Own DB `ai` (inbox, outbox, usage ledger). |
| `apps/notification-service/` | Event consumer (durable JetStream consumer + inbox); HTTP only `/health`, `/metrics`. |
| `apps/nats-setup/` | Creates/updates the JetStream streams, then exits: their one owner (ADR 0024). |
| `libs/common/` (`@app/common`) | Contracts (DTOs, responses, events, roles), auth, logging, observability, errors (RFC 9457), database errors, `HttpClient`, object storage, NATS/outbox/inbox. |

Images: `Dockerfile --target deployment-service|notification-service|content-service|ai-service|migrate`.
Infrastructure (KrakenD, Keycloak, Postgres, Redis, NATS): `k8s/README.md`.

## Commands

```bash
cp .env.example .env && npm install       # also generates the Prisma clients
# repo root first: npm run k8s:up (once) and npm run k8s:forward (keep open); or npm run infra:up
npm run migration:run                     # prisma migrate deploy, every database
npm run migration:dev -- --name <change>  # deployment; :notification / :content for the others
npm run start:dev                         # nats:setup, then every service in watch mode
npm test && npm run test:integration && npm run lint:check && npm run format:check && npm run build
```

After a KrakenD change: `npm run krakend:check`, then `npm run k8s:up` (repo root).

## Non-negotiables (details in `.claude/rules/`, loaded by path)

1. **Public path = service path**: global prefix `api`, KrakenD forwards with `no-op` encoding;
   `/health`, `/metrics` stay outside it and are never published. No business logic in KrakenD.
2. **Every business route has `@Roles` = its KrakenD roles**; data rules (owner, site) live in
   the service; the caller comes only from `@CurrentUser()`. (`microservice.md`, `security.md`)
3. **Errors are thrown, never returned**, and answered as RFC 9457 Problem Details. REST: 201 +
   `Location`, 200, 204; `{ data, meta }` for lists. (`microservice.md`)
4. **A service owns its tables; schema changes only through Prisma Migrate.** (`database.md`)
5. **Events at-least-once**: outbox in the same transaction, durable consumer + inbox; never
   `client.emit()`. Streams only from `nats-setup`. (`microservice.md`, ADRs 0007, 0024)
6. **Validate in the service**: global `ValidationPipe` (whitelist), `ParseUUIDPipe`, event
   payload classes. (`security.md`, `contracts.md`)
7. **No optimistic concurrency** (ADR 0029): no revision, ETag or If-Match; the last write wins.
8. **JSON logs with `requestId`, `/metrics` and traces in every service**; never log tokens,
   headers, bodies or query strings. (`microservice.md`, ADR 0023)
9. **New logic → unit tests; new routes → HTTP integration tests** incl. 401/403. (`testing.md`)

Skills: `/new-endpoint`, `/new-service`, `/security-review`. Review format: `docs/ai/code-review.md`.

If a convention changes, update this file and the matching rule in the same change.
