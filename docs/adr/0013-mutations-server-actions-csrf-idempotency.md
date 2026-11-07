# 0013. Mutations: Server Actions + origin check + `once()`

- **Status:** Accepted
- **Date:** 2026-11-05 (recorded 2026-11-06)
- **Related:** `portfolio-web/.claude/rules/forms.md`, `/new-form` skill (portfolio-web), `portfolio-web/src/proxy.ts`, `portfolio-web/src/lib/security/csrf.ts`,
  `portfolio-web/src/lib/actions/idempotency.ts`, `portfolio-web/src/lib/actions/result.ts`

## Context

The site will take orders and bookings (and more shops are planned under the same domain). A
cookie session makes every POST a CSRF target; `SameSite=Lax` doesn't stop sibling subdomains
(same site) or old browsers. Double clicks and resubmits must not create two orders, and the
client must not decide prices or ownership.

## Decision

- **Server Actions by default**; Route Handlers only for external callers (webhooks, OAuth
  callback), and nothing changes state on GET.
- **CSRF**: `portfolio-web/src/proxy.ts` refuses every POST/PUT/PATCH/DELETE whose `Origin` (or
  `Sec-Fetch-Site`) isn't `APP_URL` → 403; state-changing Route Handlers call `rejectCrossSite()`
  again; Next's own Server Action origin check stays on. Third-party webhooks use the provider's
  signature instead.
- Inside every action: re-check the session, validate every field, build the API body field by
  field, never take user id / prices / ownership from the client.
- **Creates are idempotent per submission**: a random `submissionId` in the form and
  `once(scope, action)` (Redis `SET NX EX` under `web:idem:*`): a resubmit gets the first result,
  a concurrent duplicate gets `duplicate_submission`, a failure can be retried.
- Actions return `ActionResult<T>`: a safe message, field errors and the request id, never
  upstream payloads.

## Consequences

- One checklist (`forms.md`) and one procedure (`/new-form`) for every new form; reviewed with
  `portfolio-web/docs/ai/code-review.md`.
- Non-browser clients can't post to the site (no Origin header) — intended.
- `once()` keeps successful results 24 h in Redis per submission.

## Alternatives considered

- **CSRF tokens (synchronizer pattern)**: more moving parts than an origin check that every
  current browser supports. Not needed now.
- **Client-side duplicate prevention only (disable the button)**: doesn't stop resubmits or
  retries. Rejected as the only measure.
