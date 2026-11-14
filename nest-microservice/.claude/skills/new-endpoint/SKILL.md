---
name: new-endpoint
description: Add a new public REST operation end-to-end in this monorepo (contract in libs/common → service REST route → KrakenD endpoint → tests). Use when asked to add an endpoint, a new action on a resource, or a new resource inside an existing microservice.
argument-hint: [METHOD /api/resource/path — what it does — owning service]
---

Add `$ARGUMENTS` end-to-end. The reference implementation is the **deployments** feature; open the matching file there before writing each step.

If the owning service, the HTTP method/status, the request/response fields, or **who may call it (roles, ownership)** are unclear, ask before writing code.

## 1. Contract — `libs/common/src/contracts/<resource>/`
1. Add input DTO classes with `class-validator` + `@ApiProperty` (bounded lengths, `@IsIn` for enums).
2. Add or extend the response interface in `<resource>.types.ts` (ISO date strings).
3. New permission? Add it to `<RESOURCE>_ROLES` (`<resource>.roles.ts`) **and** to the realm (`k8s/overlays/<env>/keycloak/realm.json` for new setups; Admin Console for the running Keycloak), then assign it to the right groups.
4. If other services should react, add an event subject to `<RESOURCE>_EVENTS` (`events.<resource>.<past-tense-verb>`) and an event class in `<resource>.events.ts`.
5. Export through the barrels. Only make **backward-compatible** changes (see `.claude/rules/contracts.md`).

## 2. Owning service — `apps/<service>/src/<resource>/`
6. Service method: takes the caller (`AuthUser`) when it writes or needs data-level rules (ownership → `ForbiddenException`); business logic, throw Nest exceptions (404/409/422), map the Prisma row to the response contract, write events (with `actorId`) with `addToOutbox(tx, …)` in the SAME transaction as the change, then `outbox.poke()` (ADR 0007).
7. REST controller route with `@Roles(...)` and `@CurrentUser()` under `@Controller('<resource>')` (→ `/api/<resource>`) with the correct status: 201 + `Location`, 200, 204 (`@HttpCode`) or 202 + `Location`. `ParseUUIDPipe` for ids, `@ApiOperation` and one `@Api*Response` per possible status.
8. New resource? Create a feature module (import `OutboxModule` if it writes events) and register it in the service's root module.
9. Schema change? Edit `prisma/schema.prisma`, run `npm run migration:dev -- --name <change>`, and read the generated SQL before committing.

## 3. KrakenD — `k8s/base/krakend/config/krakend.tmpl`
10. Add one endpoint object per method: same public and backend path, `"output_encoding": "no-op"`, backend `"encoding": "no-op"` with `"host": [{{ marshal .env.services.<service> }}]`, `input_query_strings` for every query param, `input_headers` with `Authorization` and `X-Request-Id` (plus `Content-Type` for requests with a body), and `"extra_config": {{ template "endpoint.tmpl" (dict "env" .env "roles" (list "<role>" ...) "limit" "write") }}` with the route's roles. See `.claude/rules/krakend.md`.
11. At the repo root: validate with `npm run krakend:check` and roll it with `npm run k8s:up`.
11b. If portfolio-web uses it: a typed helper in `web/packages/core/src/api/<resource>.ts` (response types mirroring the contract) and, for a form, its `/new-form` skill.

## 4. Tests
12. Unit test for the service method (mock `PrismaService` incl. `outboxMessage.create` + `OutboxRelay`), including the error branch, the ownership branch, and the outbox row written / not written.
13. E2e in `apps/<service>/test/` with signed tokens: happy-path status + headers, 401 without token, 403 without the role (nothing written), validation 400, and each error status the route can return.

## 5. Check
14. Run `npm run lint:check`, `npm test` and `npm run test:integration`, then call the route through KrakenD (`http://localhost:8080/api/...`, from `npm run k8s:forward`) with tokens for `carol`/`bob`/`alice` (see README) and check status + headers. Report the real output; if something can't run, say so.
15. Summarize: route, roles, ownership rule, status codes, KrakenD endpoint, events, files changed, and anything you assumed.
