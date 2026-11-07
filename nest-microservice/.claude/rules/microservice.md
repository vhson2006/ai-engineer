---
paths:
  - 'apps/*-service/**'
---

# Microservice rules

## Bootstrap
- **REST service** (e.g. deployment-service): `main.ts` → `NestFactory.create()` → `configureApp(app)` from `src/setup.ts` → `listen(<NAME>_PORT)`. `setup.ts` is shared with the e2e tests. It sets the `api` prefix (excluding `health`), the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), `HttpAllExceptionsFilter` and Swagger at `/docs` (with bearer auth). No CORS: browsers never call the services (nor KrakenD, which is private).
- Every service imports `registerLogging('<name>-service')` and starts with `NestFactory.create(Module, { bufferLogs: true })` + `app.useLogger(app.get(Logger))` (`Logger` from `nestjs-pino`; for REST services this is in `configureApp`). Validate `LOG_LEVEL` (`LOG_LEVELS`) and `LOG_FORMAT` (`LOG_FORMATS`) with Joi.
- **Observability (ADR 0023):** `src/instrument.ts` = `config()` from dotenv + `startTracing('<name>-service')` imported from `@app/common/observability/tracing` (never the barrel: it loads pino before tracing can patch it), and `import './instrument'` is the FIRST line of `main.ts`. The root module imports `ObservabilityModule.forRoot('<name>-service')` and spreads `OBSERVABILITY_ENV_SCHEMA` into its Joi schema. REST services add `app.use(httpMetricsMiddleware)` first in `configureApp` and exclude `metrics` from the `api` prefix.
- The root module imports `AuthModule` (`@app/common`) and validates `AUTH_ISSUER`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE`, `AUTH_ROLES_CLIENT` with Joi. That registers `AuthGuard` globally: every route needs a valid Keycloak token.
- **Event consumer** (e.g. notification-service): a plain Nest app (HTTP only for `/health` and `/metrics` on `<NAME>_HEALTH_PORT`) that imports `JetStreamModule.forRoot('<name>-service')` and starts a `JetStreamConsumer` (durable, one name per service) in a provider's `onApplicationBootstrap` (see `notifications.consumer.ts`). Replicas share the durable consumer: each message goes to one of them. No `connectMicroservice` / `@EventPattern` for events (core NATS: no persistence, no redelivery).
- A service can be both: a REST service can also run a `JetStreamConsumer`.

## REST controllers
- `@Controller('<plural-resource>')` → `/api/<resource>`. Thin: routing, DTO validation, status codes, headers, Swagger. Logic goes in the service.
- Create: 201 (default for `@Post`) + `res.location(`${collectionPath}/${id}`)` via `@Res({ passthrough: true })`. Read/update: 200. Delete: `@HttpCode(HttpStatus.NO_CONTENT)`. Long-running work: 202 + `Location`.
- `@Param('id', ParseUUIDPipe)`. Query/body DTOs from `@app/common`. Lists return `{ data, meta }` (`Paginated<T>`).
- `@ApiOperation` plus one `@Api*Response` per status the route can return. Document `Location` in `headers` for 201, `ETag` where it is sent, and `@ApiHeader({ name: 'If-Match', required: true })` + 412/428 on conditional updates.
- Every business route has `@Roles(<RESOURCE>_ROLES.X, ...)` (any-of), the same roles as its KrakenD endpoint. Without `@Roles` any authenticated user passes, which is never what a business route wants.
- `@Public()` only for `/health` and `/metrics` (probes, scrapes). `@ApiBearerAuth()` + `@ApiUnauthorizedResponse` + `@ApiForbiddenResponse` on authenticated controllers.
- Get the caller with `@CurrentUser() user: AuthUser` and pass it to the service. Never take the caller's id from the body or a client header (`whitelist` + `forbidNonWhitelisted` reject fields like `createdBy`).
- Every public route also needs a KrakenD endpoint (root `.claude/rules/krakend.md`).

## Authorization
- Roles (coarse) are checked by KrakenD and `AuthGuard`. Rules that depend on the data (ownership, tenant, status) are checked **in the service**, after loading the row and before writing: throw `ForbiddenException` (403).
- Store the creator as the Keycloak `sub` (`createdBy`, `AuthUser.id`). Never store or compare usernames or emails: they can change.
- Rows without an owner (created before auth existed) are admin-only.
- Events carry `actorId` (the caller's `sub`) so consumers can audit.

## Events: at-least-once with outbox + inbox (ADR 0007)
- **Publish = write to the outbox in the SAME transaction as the data**: `await addToOutbox(tx, <RESOURCE>_EVENTS.X, payload satisfies <Event>)` inside `prisma.$transaction(async (tx) => …)`, then `this.outbox.poke()` after the commit. Never `client.emit()` an event (lost if the process dies after the commit or NATS is down). The service needs the `outbox_messages` table (model `OutboxMessage`, copy from deployment-service) and `OutboxModule` (relay + `PrismaOutboxStore`).
- Subjects: `events.<resource>.<past-tense-verb>` (in the JetStream stream `EVENTS`). Request/reply subjects (`@MessagePattern`, if ever) use `rpc.*`, never inside a stream: a stream answers a request with its PubAck.
- **Consume = durable JetStream consumer + inbox**: handlers registered by subject in `JetStreamConsumer`; each one validates the payload class (invalid → `PermanentMessageError` → DLQ) and runs its database work in `handleOnce(prisma, '<consumer>', message.id, subject, (tx) => …)`. The consuming service needs the `inbox_messages` table (model `InboxMessage`, copy from notification-service) in ITS OWN database.
- Outcomes: resolve → ack; throw → nak with backoff (1 s, 5 s, 30 s, 2 min, 10 min), dead-lettered to `dlq.<consumer>.<subject>` after `maxDeliver` (10); `PermanentMessageError` → DLQ at once. Inspect the DLQ with `nats stream view DLQ` (nats-box).
- Delivery is at-least-once: a message can arrive twice; the inbox makes the database effect happen once. Side effects outside the database (email, HTTP) can still repeat in a crash window: give them an idempotency key or accept it.
- Every NATS connection uses `natsConnectionOptions(url, name)` from `@app/common` (`JetStreamModule` does): it reconnects forever. The nats.js default gives up after ~20 s and the process keeps running deaf, with a green `/health`.

## Logging
- Use `private readonly logger = new Logger(MyService.name)` from `@nestjs/common`; it is written by pino as JSON with `context` and, inside a request, the `requestId`. Never `console.log`.
- Log a message plus small structured context; never tokens, passwords, headers, bodies, full connection strings or personal data beyond the user id.
- Access logs are automatic (don't log "request received"). `/health` and `/metrics` are not access-logged, measured or traced.

## Metrics and traces (ADR 0023)
- HTTP, outbox and consumer metrics are automatic (`libs/common/src/observability/metrics.ts`). A new business metric: a prom-client `Counter`/`Histogram` in the default registry, `snake_case` with a unit suffix (`_total`, `_seconds`), and only labels with a small, fixed set of values (route template, subject, outcome). Never an id, user, email, path with ids or query string: Grafana Cloud bills every distinct label combination.
- Spans: HTTP, Express routes, Nest handlers and pg queries are automatic; each message delivery gets a CONSUMER span. Add a manual span only around significant work, with `trace.getTracer(...)`; same attribute rules as labels.
- 4xx are logged at `warn`, 5xx at `error` (with stack) by `HttpAllExceptionsFilter`; don't log the same error again before throwing.

## Errors
- Throw Nest exceptions: `NotFoundException` (404), `ConflictException` (409), `UnprocessableEntityException` (422, business-rule violation), `BadRequestException` (400).
- Every error body is **RFC 9457 Problem Details** (`application/problem+json`), built by `toProblem` (`libs/common/src/errors/problem-details.ts`, used by both filters): `{ type: "about:blank", title, status, detail, instance, code, requestId, errors? }`. `code` is the stable machine-readable reason (`not_found`, `validation_error`, `unique_violation`, `database_unavailable`, `upstream_timeout`, `payload_too_large`...); `errors` lists `{ field, message }` for validation. Unknown errors become 500 `internal_error` with no details. Never build an error body by hand.
- The exception message becomes `detail`: write it for the API user, without internals (ids are fine, SQL/hosts/stack are not).
- `setup.ts` wires the HTTP standards: `exceptionFactory: validationExceptionFactory` (field errors), `requireJsonBody` (415 for non-JSON bodies), `jsonBody()` (400 `malformed_body` / 413), `noStoreCache` (`Cache-Control: no-store`). AuthGuard adds `WWW-Authenticate` on 401/403. Keep these in every REST service.
- Don't wrap everything in try/catch. Catch only to translate, retry or add context, then re-throw.

## Data and events
- The service owns its database. Map Prisma rows to the response contract (`toResponse`) with ISO date strings. Never return a row directly.
- Enforce invariants with DB constraints (e.g. unique index → 409), not "check then insert".
- Events are written to the outbox in the transaction of the change they describe (see "Events" above), never published directly.
- Make REST handlers idempotent where possible: KrakenD may time out while the service still completes the work.
- **No lost updates.** A resource that clients modify has a `revision Int @default(1)` column, returned in the body and as `ETag: "<revision>"` (`entityTag()`) on GET one / POST / PATCH. PATCH (and PUT) require `If-Match`: `@Headers('if-match')` → service → `assertIfMatch(ifMatch, entityTag(current.revision))` **after** the 404/403 checks, then a write conditional on the revision: `updateManyAndReturn({ where: { id, revision: current.revision, ...NOT_DELETED }, data: { ...dto, revision: { increment: 1 } } })`. No row back → `getOrFail` (404 if deleted) else `throw staleResource()` (412). Missing header → 428. Read-modify-write without this ("read current, then update") is a race. Helpers: `libs/common/src/http/conditional-requests.ts`. KrakenD forwards `If-Match` on that endpoint (`krakend.md`).
- Don't chain synchronous calls across services (A → B → C) inside one request. Prefer events.

## Calling external APIs
- Every outbound HTTP call (third-party APIs, another system) goes through `HttpClient` from `@app/common` (`libs/common/src/http-client/`). Never call `fetch`/axios directly in a service: timeouts, retries, Retry-After, error mapping and request-id propagation would each be re-invented (or forgotten).
- One small client class per upstream, e.g. `src/<feature>/clients/<upstream>.client.ts`: it creates the `HttpClient` from validated config (base URL, token via Joi), exposes business methods (`getImage(name, tag)`), and returns OUR types through `parse`, never raw upstream JSON. Register it as a provider behind an interface + DI token so services can be unit-tested with a fake.
- Path values go in `params` (`/images/{name}`), never string-concatenated: they are URL-encoded, so user input can't change the path.
- Retries are automatic only for idempotent methods. A POST/PATCH that must survive retries passes `idempotencyKey` (a stable business id such as the order id), and the upstream must support it.
- A 404 that is a normal answer ("doesn't exist") uses `allowStatus: [404]` and returns `null`; anything else unexpected throws `UpstreamError`, which `toProblem` maps to 502/503/504 with a generic message. Don't catch it just to rethrow something vaguer.
- Keep `totalTimeoutMs` below what our own caller waits (KrakenD: 5 s). The default is 4 s.
- HTTP apps register `requestContextMiddleware` (`setup.ts`), so the incoming `X-Request-Id` is forwarded to upstreams automatically. In an event handler, wrap the work in `runWithRequestId(...)` if the event carries an id.
- Never log or return the upstream's body, headers or query string (`UpstreamError.responseSnippet` is for debugging in a breakpoint, not for logs).

## Files and object storage
- File bytes never go through KrakenD or a service: presigned PUT to upload, presigned GET (private) or the CDN URL (public) to read. Never add multipart upload endpoints, never stream files from a controller. Downloads: `GET /api/files/:id/download-url` returns the link as JSON; the web app redirects the browser (`web/apps/portfolio-web/src/app/files/[id]/download/route.ts`).
- Use `FilesService` (deployment-service) or, in another service, `StorageModule` + `OBJECT_STORAGE` (`ObjectStorage`) from `@app/common`. Never instantiate an S3 client elsewhere: provider differences (Spaces ACL, R2, checksums) are handled there once.
- A new kind of file = a new entry in `FILE_PURPOSES` (`libs/common/src/contracts/file/file.purposes.ts`): visibility, allowed types, max size, `attachable`. The client chooses a purpose, never the bucket, the key or the visibility. Never allow types a browser executes (HTML, SVG, JS).
- Keys are generated by the server (`<purpose>/<yyyy>/<mm>/<id>.<ext>`, extension from the validated type). The user's file name is only display data (`sanitizeFilename`), never part of a key or path.
- Attach files to a resource inside the resource's transaction with a conditional update (owner, `uploaded`, right purpose, not attached yet) and check the affected count; otherwise 422 `invalid_attachments`.
- Private files of others answer 404 (not 403): don't reveal that they exist.
