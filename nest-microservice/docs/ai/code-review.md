# Code review checklist (humans and AI)

Use this for every PR, and when an AI agent self-reviews before calling a task done.

## Checklist

**Architecture**
- [ ] Every route is declared in `k8s/base/krakend/config/krakend.tmpl` with the shared `endpoint.tmpl` (same path, `no-op`, explicit query strings/headers). No business logic in KrakenD.
- [ ] The API stays private: no `api` route on the edge Gateway, no KrakenD CORS, no public Service for KrakenD or a service; only `www` and `auth` (app realm) are published.
- [ ] REST controllers are thin. Business logic is in the service layer of the owning microservice.
- [ ] No app reads another service's database.

**Contracts (`libs/common`)**
- [ ] Event subjects are constants (`<RESOURCE>_EVENTS`), not string literals. DTOs, responses and events are defined in `contracts/`.
- [ ] Changes are backward compatible (only optional fields added; nothing renamed or removed), or a new route/event subject was added.

**HTTP semantics (REST services)**
- [ ] Correct status codes: 201 + `Location`, 200, 204, 202 + `Location`. Errors are thrown, never returned with 2xx.
- [ ] Swagger documents every status a route can return.

**Microservices**
- [ ] REST services use `configureApp` (`HttpAllExceptionsFilter`, `ValidationPipe`). Events are written with `addToOutbox(tx, …)` inside the transaction of the change (never `client.emit()`); consumers validate payloads and run their database work in `handleOnce` (inbox). Services throw Nest exceptions with the right status.
- [ ] Events are emitted only after the write succeeds. Handlers are idempotent where a timeout/retry could repeat them.

**Database**
- [ ] Schema changes come with a reviewed Prisma migration (`prisma/migrations/<timestamp>_<name>/migration.sql`) that matches `schema.prisma`; already-applied migrations are never edited.
- [ ] Invariants are enforced by constraints. Queries are parameterized. Lists are paginated with a deterministic order.

**Security** (see `.claude/rules/security.md`)
- [ ] Input is validated in the service (KrakenD doesn't validate bodies).
- [ ] Every new route has `@Roles` matching its KrakenD `auth/validator` roles; no new `@Public()` except probes. Ownership/data rules are enforced in the service with the caller from `@CurrentUser()`. Ids and lengths are bounded. No secrets in code or logs. New env vars are in Joi + `.env.example`.

**Tests**
- [ ] New service logic has unit tests. New or changed routes have HTTP integration tests (`apps/<service>/test/`) with status codes and headers.
- [ ] No `.only`/`.skip`. `npm run lint:check`, `npm test` and `npm run test:integration` pass.

**Docs**
- [ ] `CLAUDE.md` and `.claude/rules/*` still describe the code. Update them in the same PR if a convention changed.

## Reporting findings

Group by severity, most severe first. Give each finding a `file:line`, what goes wrong in a concrete scenario, and the rule it breaks.

1. **Critical**: security hole, data loss or corruption, cross-service database access, breaking contract change, missing validation on a public route, an internal route (`/health`, `/metrics`, `/docs`) published in KrakenD, KrakenD / a service / Keycloak admin or realm `master` reachable from the Internet, a KrakenD endpoint without `auth/validator`, a business route without `@Roles`, a caller id taken from client input, an id, user or user input in a metric label or span attribute.
2. **Should fix**: wrong status code, missing filter/migration, KrakenD endpoint missing a query string or header, missing tests, swallowed errors.
3. **Suggestion**: readability or naming improvements that don't block merging.
