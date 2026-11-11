---
paths:
  - '**/*.spec.ts'
  - '**/*.integration-spec.ts'
  - 'apps/*/test/**'
---

# Testing rules

## Where tests live
Every REST service (deployment-service, content-service; a new service too):

| Kind | Location | Run |
|---|---|---|
| Unit | `apps/<service>/test/unit/<src folder>/<file>.spec.ts`, mirroring `src/` | `npm test` |
| HTTP integration (real Nest pipeline, Prisma + NATS mocked) | `apps/<service>/test/integration/<resource>.integration-spec.ts` + `test/jest-integration.json` (add it to the `test:integration` script) | `npm run test:integration` |
| Shared helpers | `apps/<service>/test/support/` (`setup-env.ts`; content-service also app + token signing, fixtures, Prisma mock) | |

`libs/common` and notification-service keep `<file>.spec.ts` next to the code.
`describe('[<file-under-test>] (unit)', ...)` for unit tests. Nothing here touches a real
database, KrakenD or Keycloak: check those by hand through KrakenD (below).

## Unit tests (services, libs)
- Service methods take the caller (`AuthUser`): build fixtures for owner / other user / admin.
- Use `Test.createTestingModule` with mocked providers: `PrismaService` → `{ <model>: { create, findFirst, findMany, count, update, updateMany }, $transaction }` as `jest.fn()` (re-arm `$transaction` to `Promise.all` after the reset), plus `outboxMessage: { create }` when the service writes events (and `$transaction(fn)` running `fn` with the mock as tx), and `OutboxRelay` → `{ poke }`.
- `jest.resetAllMocks()` in `beforeEach`.
- Assert behaviour: thrown exception types (`NotFoundException`), the outbox row written (`outboxMessage.create` with `subject` + `payload`) or **not** written (failed / rolled-back write), pagination math. Consumers: test the handlers (`consumer.handlers[SUBJECT]`) with a fake inbox: processed once, duplicate skipped, invalid payload → `PermanentMessageError`.

## HTTP integration
- Boot the real service module, apply `configureApp(app)` from `src/setup.ts`, and override `PrismaService`, `JETSTREAM` (`{ nc: { drain }, js: { publish }, jsm: {} }`) and `OutboxRelay` (`{ poke, start, stop }`) with mocks. No database or broker is needed (never let a test connect to a real NATS).
- Auth is real: generate an RS256 key pair in `beforeAll` (`jose.generateKeyPair`), override `AUTH_JWKS` with `createLocalJWKSet({ keys: [publicJwk] })`, and sign tokens per test (`SignJWT` with `sub`, `iss`, `aud`, `exp`, `resource_access.<client>.roles`). Never mock `AuthGuard` away.
- Env lives in `test/support/setup-env.ts`, because ConfigModule validates env at import time.
- For every route, assert the **status code**, the important **headers** (`Location` on 201), and the body. KrakenD passes these through unchanged (`no-op`), so they are what clients get.
- Cover the error mapping: invalid input → 400 with nothing written, unknown id → 404, Prisma P2002 → 409, unexpected error → generic 500 with no internals.
- Cover auth on every new route: no token → 401, missing role → 403 with nothing written, and the ownership rule (another user → 403, admin → allowed). The suite already covers bad signature, expiry, wrong issuer/audience and HS256 once for the guard.

## Always
- New service logic → unit test. New or changed route → HTTP integration test, plus a manual check through KrakenD (`http://localhost:8080`, from `npm run k8s:forward`).
- No `.only` / `.skip` committed. No real network, database or secrets in unit or integration tests.
