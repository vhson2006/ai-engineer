---
name: new-service
description: Scaffold a new microservice app in this Nest monorepo (nest-cli project, REST and/or NATS event consumer, /health, /metrics + tracing, config validation, optional Prisma database, contracts, KrakenD routes, tests). Use when asked to add a new microservice or split a domain out into its own service.
argument-hint: [service-name — responsibility — needs database? yes/no]
---

Create the microservice `$ARGUMENTS`. Mirror `apps/deployment-service` (REST + database + emits events) or `apps/notification-service` (event consumer, no database).

Before writing, confirm with the user:
- the **responsibility** in one sentence, and which data it owns (a service owns its tables; nobody else touches them)
- whether it **serves clients over REST** (through KrakenD), **reacts to events** (durable JetStream consumer + inbox), or both
- whether it needs its **own database**, and which **port** it listens on

## Steps
1. **nest-cli.json**: add a `projects.<name>-service` entry (type application, root `apps/<name>-service`, entryFile `main`, its `tsconfig.app.json`).
2. **`apps/<name>-service/tsconfig.app.json`**: copy from deployment-service and change `outDir`.
3. **Bootstrap**:
   - REST: `src/setup.ts` (`configureApp`: `httpMetricsMiddleware` first, `api` prefix excluding `health` and `metrics`, `ValidationPipe`, `HttpAllExceptionsFilter`, Swagger) + `main.ts` that calls it and listens on `<NAME>_PORT`.
   - Event consumer: `main.ts` listens on `<NAME>_HEALTH_PORT` for `/health` and `/metrics`; the module imports `JetStreamModule.forRoot('<name>-service')` and a provider starts a `JetStreamConsumer` (durable name = service name) with one handler per subject, each wrapped in `handleOnce` (copy `notifications.consumer.ts`). It needs a database for its inbox (`inbox_messages`, step 5). It consumes from the shared `EVENTS` stream: never add a stream per service, never create/update a stream from the service (only `apps/nats-setup` does, ADR 0024).
4. **`src/<name>-service.module.ts`**: `ConfigModule.forRoot({ isGlobal, validationSchema: Joi... })` with every env var the service reads (including `LOG_LEVEL`/`LOG_FORMAT`), `registerLogging('<name>-service')`, `ObservabilityModule.forRoot('<name>-service')` (+ `...OBSERVABILITY_ENV_SCHEMA` in Joi), plus `HealthController` (`@Public()`). `src/instrument.ts` starts tracing (copy deployment-service's) and `import './instrument'` is the first line of `main.ts` (ADR 0023). In `main.ts`: `NestFactory.create(Module, { bufferLogs: true })` then `app.useLogger(app.get(Logger))` from `nestjs-pino`. A REST service also imports `AuthModule` and validates `AUTH_ISSUER`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE`, `AUTH_ROLES_CLIENT`. If it gets its own roles, create a Keycloak client for it (resource server) and use it as audience and roles client.
5. **With a database:**
   - `prisma/schema.prisma` (generator `prisma-client`, `output = "../src/generated/prisma"`, `moduleFormat = "cjs"`) and `prisma.config.ts`, copied from deployment-service
   - `src/prisma/prisma.service.ts` + `prisma.module.ts` (global), connecting with `@prisma/adapter-pg` from the service's own DB_* vars
   - a first migration in `prisma/migrations/`
   - `package.json` scripts: add `prisma generate --config apps/<name>-service/prisma.config.ts` to `prisma:generate`, plus `migration:*:<name>` scripts
   - a database in `k8s/components/local-data/postgres` (separate DB name, or a separate StatefulSet) and in `docker-compose.yml`
   - a health check that runs `SELECT 1`
6. **Contracts**: `libs/common/src/contracts/<resource>/` (DTOs, types, events) exported through the barrels.
7. **Feature module**: REST controller and/or JetStream consumer provider, service, Prisma model. If the service writes events: the `outbox_messages` table (copy `OutboxMessage` from deployment-service) and an `OutboxModule` (copy `src/messaging/outbox.module.ts`); events go through `addToOutbox(tx, …)`.
8. **KrakenD** (only for REST routes clients need): add `services.<name>` (`http://host.docker.internal:<port>` in dev) to every `k8s/overlays/*/krakend/settings/env.json`, then the endpoints to `k8s/base/krakend/config/krakend.tmpl`. Follow `/new-endpoint`.
9. **Production**: a `--target <name>-service` stage in the `Dockerfile` (copy of the existing ones), a Deployment (+ Service if it has HTTP) in `k8s/components/apps/` with the same hardening (non-root, read-only root fs + `/tmp` emptyDir, probes on `/health`, resources), its env file in `k8s/overlays/prod/env/` + `configMapGenerator`, an ExternalSecret for its secrets, an image entry in `overlays/prod/kustomization.yaml`, 2 replicas + a PodDisruptionBudget, and NetworkPolicy rules for exactly the flows it needs (who calls it, NATS). With its own database: a migration Job like `overlays/prod/migration-job.yaml`. Check with `npm run k8s:render:prod`.
10. **Wiring**: new env vars in `.env.example`, and `build`, `start:<name>`, `start:prod:<name>` scripts plus the `start:dev` concurrently list in `package.json`. If it has REST e2e tests, make `test:e2e` run them too.
11. **Tests**: a unit spec for the service, and e2e tests in `apps/<name>-service/test/` for any REST routes.
12. **Docs**: add the service to the Layout table and diagram in `CLAUDE.md` and `README.md`.

## Check
Run `npm run build`, `npm test` and `npm run test:e2e`, and call any new public route through KrakenD. Report the real results and list the env vars and infrastructure the user must provide.
