# 0012. One API client (`apiFetch`): retries only what is safe, never throws

- **Status:** Accepted
- **Date:** 2026-11-06 (recorded)
- **Related:** `portfolio-web/src/lib/api/client.ts`, `portfolio-web/src/lib/api/`, `portfolio-web/.claude/rules/api.md`

## Context

The first helper (`apiGet`) did GET only, no retry, no timeout policy and nothing on 401. Every
new call would have re-invented error handling, and a naive retry of a POST can create an order
twice.

## Decision

All server-side API calls go through **`apiFetch<T>(path, options)`**:

- Bearer token from the session; `X-Request-Id` per call, **the same on every retry** (one user
  action = one id in the API logs).
- 8 s per attempt, 15 s budget. **Retries** (exponential backoff + full jitter, `Retry-After`
  honoured up to 3 s) only on network errors, timeouts, 502/503/504 and 429, and only for
  idempotent methods, a request with an `idempotencyKey`, or one declared `idempotent: true`.
- **401** → renew the token once (0002) and repeat (nothing ran, so even a POST is safe).
- `redirect: 'manual'`: the token is never sent to another host.
- **Never throws** for HTTP or network problems: returns `{ ok: true, data }` or
  `{ ok: false, status, code, message, errors, requestId }` from RFC 9457 Problem Details; 5xx
  details are never shown.

## Consequences

- Callers branch on `ok` / `code`; users see a safe message and the request id.
- POST/PATCH are not retried unless made idempotent, by design.
- A raw `fetch` to the API is a review finding (`portfolio-web/docs/ai/code-review.md`).

## Alternatives considered

- **Raw `fetch` per call site**: inconsistent errors, unsafe retries, missing 401 handling. Rejected.
- **A generic HTTP library (axios, ky)**: still needs our token, retry and Problem Details policy;
  native `fetch` + a small module is enough.
