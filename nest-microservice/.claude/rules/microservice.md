---
paths:
  - 'apps/*-service/**'
---

# Microservice rules

New service: `/new-service` (full bootstrap). Reference for every convention: deployment-service.

## Bootstrap
- `main.ts`: `import './instrument'` FIRST (tracing, ADR 0023: `startTracing` from
  `@app/common/observability/tracing`, never the barrel), `NestFactory.create(Module, { bufferLogs: true })`,
  `configureApp(app)` from `src/setup.ts` (shared with the integration tests), `listen(<NAME>_PORT)`.
- `setup.ts` keeps, in order: `httpMetricsMiddleware`, `requestContextMiddleware`, `noStoreCache`,
  `requireJsonBody` (415), `jsonBody()` (400 `malformed_body` / 413), prefix `api` excluding
  `health` and `metrics`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`,
  `validationExceptionFactory`), `HttpAllExceptionsFilter`, Express `etag` off (ADR 0029), Swagger
  `/docs` with bearer auth. No CORS.
- Root module: Joi-validated env (incl. `LOG_LEVEL`, `LOG_FORMAT`, `OBSERVABILITY_ENV_SCHEMA`,
  `AUTH_*`), `registerLogging('<name>-service')`, `ObservabilityModule.forRoot('<name>-service')`,
  `AuthModule` (global `AuthGuard`).
- Event consumer: HTTP only `/health` + `/metrics` (`<NAME>_HEALTH_PORT`), `JetStreamModule.forRoot`
  and a `JetStreamConsumer` (one durable name per service) started in `onApplicationBootstrap`.
  Never `connectMicroservice` / `@EventPattern` (core NATS loses messages). A REST service may also consume.

## REST controllers
- `@Controller('<plural-resource>')` → `/api/<resource>`; thin (routing, DTOs, status, headers,
  Swagger), logic in the service. One feature module per resource.
- 201 + `res.location(collection + id)` (`@Res({ passthrough: true })`), 200 read/update,
  `@HttpCode(204)` delete, 202 + `Location` for long work. Lists `{ data, meta }` (`Paginated<T>`).
- `ParseUUIDPipe` on ids; DTOs from `@app/common`. `@ApiOperation` + one `@Api*Response` per status.
- `@Roles(...)` (any-of) on every business route, equal to its KrakenD endpoint; `@Public()` only
  for `/health`, `/metrics`. Caller = `@CurrentUser()`, never the body or a header.
- Every route needs its KrakenD endpoint (root `.claude/rules/krakend.md`).

## Authorization and data
- Coarse roles: KrakenD + `AuthGuard`. Data rules (owner, site, status) in the service after
  loading the row, before writing → 403 (or 404 to hide another tenant's data).
- Store the creator as the Keycloak `sub`; never usernames or emails. Rows without an owner are admin-only.
- Map rows to the response contract (`toResponse`/mappers, ISO dates); never return a row.
- Invariants by constraints (unique → 409), not "check then insert".
- No optimistic concurrency (ADR 0029): PATCH = plain update, last write wins; no row → 404.
- Handlers idempotent where possible (KrakenD may time out while the work completes). No
  synchronous chains across services (A → B → C): use events.

## Events (ADRs 0007, 0024)
- Publish: `addToOutbox(tx, <RESOURCE>_EVENTS.X, payload satisfies <Event>)` inside the data's
  `$transaction`, then `outbox.poke()`. Needs `outbox_messages` + `OutboxModule`. Payloads carry
  `actorId` (caller's `sub`).
- Subjects `events.<resource>.<past-tense>` on the shared `EVENTS` stream; `rpc.*` for request/reply,
  never in a stream. Streams only in `STREAM_CONFIGS`, applied by `nats-setup`; a service creates
  only its own durable consumer. Σ `max_bytes` × replicas ≤ `max_file_store` ≤ 90 % of the volume
  (`streams.spec.ts`): raise both in one change.
- Consume: one handler per subject, payload class validated (invalid → `PermanentMessageError` →
  DLQ), DB work in `handleOnce(prisma, '<consumer>', id, subject, tx => …)` (`inbox_messages` in
  its own DB). Throw → retry with backoff, DLQ after 10 (`nats stream view DLQ` in nats-box). Side effects outside the DB can repeat:
  idempotency key or accept it.
- NATS connections only via `natsConnectionOptions` (reconnect forever).

## Logging, metrics, traces (ADR 0023)
- `new Logger(Class.name)` (pino JSON with `requestId`), never `console.log`. Message + small
  context; never tokens, passwords, headers, bodies, connection strings, personal data beyond the user id.
- Access logs, HTTP/outbox/consumer metrics and spans are automatic. A business metric:
  prom-client, `snake_case` + unit suffix, low-cardinality labels only (never ids, users, paths
  with ids, queries). Manual spans only around significant work.
- The filter logs 4xx at `warn`, 5xx at `error`: don't log an error before throwing it.

## Errors
- Throw Nest exceptions (400, 404, 409, 422 business rule…) or let `DatabaseError` /
  `UpstreamError` through; `toProblem` builds every RFC 9457 body (`code`, `requestId`,
  `errors`). Never build an error body by hand. `detail` is for the API user: no SQL, hosts, stacks.
- try/catch only to translate, retry or add context.

## Calling external APIs
- Only through `HttpClient` (`@app/common`): one client class per upstream
  (`src/<feature>/clients/<upstream>.client.ts`) behind a DI token,
  config via Joi, returns OUR types (`parse`). Path values in `params`, never concatenated.
- Retries only for idempotent methods; a POST that must survive retries sends `idempotencyKey`.
  Normal 404 → `allowStatus: [404]` + `null`; anything else → `UpstreamError` (502/503/504).
- `totalTimeoutMs` < KrakenD's 5 s (default 4 s). `X-Request-Id` is forwarded automatically; in a
  consumer use `runWithRequestId`. Never log or return the upstream's body, headers or query.

## Files (ADRs 0006, 0014)
- Bytes never through KrakenD or a service: presigned PUT/GET or the CDN URL; downloads answer
  the link as JSON (`/download-url`), never a redirect or a stream.
- Storage only through `FilesService` or `StorageModule` + `OBJECT_STORAGE`. A new kind of file =
  an entry in `FILE_PURPOSES` (visibility, types, size, attachable); never types a browser
  executes. Keys are server-generated; the user's file name is display data only.
- Attach inside the resource's transaction with a conditional update and a count check (else 422
  `invalid_attachments`). Others' private files answer 404.
