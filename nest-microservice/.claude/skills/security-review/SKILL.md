---
name: security-review
description: Security-review a change in this KrakenD + REST + NATS-events monorepo (gateway exposure, auth, inter-service trust, validation, injection, secrets, error leakage). Use before opening a PR, or when asked to security-review a diff, file, service, or endpoint.
argument-hint: [diff | file | service | endpoint]
---

Security-review `$ARGUMENTS` (default: uncommitted changes plus the commits on this branch vs `master`/`main`). The authoritative rules are in `.claude/rules/security.md`. Report findings in the format from `docs/ai/code-review.md` (Critical / Should fix / Suggestion), each with file:line and the rule it breaks. Skip style issues.

## Pass 1: Exposure and authentication
1. Is every new public route declared explicitly in `k8s/base/krakend/config/krakend.tmpl`, using the shared `endpoint.tmpl` (never an inlined or missing validator)? Publishing an internal route (`/health`, `/metrics`, `/docs`), a wildcard path, or `"*"` query strings/headers is Critical. Are service ports kept off any public network?
2. Does every new KrakenD endpoint have `auth/validator` (same issuer/audience/jwk_url as the others) with the right `roles`, and does the service route have the same `@Roles`? Is every `@Public()` deliberate (probes only)? Are data-level rules (ownership) enforced in the service?
3. Does any new NATS subject let a caller do something KrakenD would normally restrict? Subjects aren't access-controlled unless NATS auth/permissions are configured.

## Pass 2: Inter-service trust
4. Does each new REST route validate its input with DTO classes from `@app/common` (`whitelist`, `forbidNonWhitelisted`, `ParseUUIDPipe`)? Does each new JetStream handler validate its event class (invalid → `PermanentMessageError`, DLQ) and run its database work in `handleOnce` (inbox)? Are events written with `addToOutbox` in the same transaction as the data, never `client.emit()`?
5. Is the caller's identity taken only from `@CurrentUser()` (the verified token)? Taking a user id from the body, query or a custom header is Critical.
6. Does any app read or write another service's database? That's Critical.

## Pass 3: Input and injection
7. Ids use `ParseUUIDPipe` / `@IsUUID`. Strings are `@MaxLength`-bounded, and pagination is bounded by `MAX_PAGE_SIZE`.
8. Queries are parameterized (repository / query builder). Raw SQL built from strings is Critical. `LIKE` with user input is escaped when it must be literal.
9. Sorting or filtering by client-supplied field names goes through an allow-list.

## Pass 4: Secrets, config and logging
10. No hardcoded credentials or connection strings. New env vars are in the Joi schema **and** `.env.example`.
11. No secret, token, full connection string or whole payload reaches a log call (check `logger.*` and the `HttpAllExceptionsFilter` / `RpcAllExceptionsFilter` messages).
12. 5xx responses expose no stack traces, SQL or internal hostnames. Response contracts don't include internal fields.

## Pass 5: Resilience as security
13. KrakenD's `timeout` bounds every request. A service-to-service HTTP call without its own timeout is Should fix.
14. Long or expensive operations can't be triggered without limits: consider rate limiting in KrakenD (`qos/ratelimit/router`), and 202 + a queue instead of holding a request open.

## Pass 6: Coverage
15. Security-relevant branches have tests: validation rejects bad input, the service isn't called on invalid input, and the error mapping doesn't leak details.

Never paste real credentials, production rows or raw logs into a prompt while doing this review (see the root `docs/ai/ai-usage-policy.md`).
