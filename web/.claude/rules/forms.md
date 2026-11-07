---
paths:
  - 'apps/*/src/app/**'
  - 'apps/*/src/components/**'
  - 'packages/ui/src/**'
  - 'apps/*/src/features/**'
  - 'apps/*/src/proxy.ts'
  - 'packages/core/src/security/csrf.ts'
  - 'packages/core/src/auth/cookies.ts'
  - 'packages/core/src/actions/**'
  - 'apps/*/next.config.ts'
---

# Forms and anything that changes state (orders, bookings, profile, logout…)

Every new form or mutation MUST follow all of these. Review checklist, not suggestions.
Step by step: the `/new-form` skill.

1. **Server Action by default.** Use a Route Handler (`route.ts`) only when something else than
   our own pages calls it (webhook, OAuth callback). Never change state in a GET (page, route,
   or a GET form).
2. **CSRF: own origin only.** `apps/<app>/src/proxy.ts` rejects every POST/PUT/PATCH/DELETE whose `Origin`
   (or `Sec-Fetch-Site`) isn't `APP_URL`. Don't weaken it, and don't exclude new paths from its
   matcher. A state-changing Route Handler ALSO starts with:
   ```ts
   const blocked = rejectCrossSite(request); // '@web/core/security/csrf'
   if (blocked) return blocked;
   ```
   Webhooks from third parties (payment providers) don't fit this: they get their own path,
   verified by the provider's signature (HMAC), never by our session cookie.
3. **Re-check auth inside the action/handler**: `getSessionUser()` / `apiFetch` (signed out →
   401 `unauthenticated`, no call made); signed out → stop. Proxy and page-level checks don't
   protect a Server Action (it is a POST to any page).
3a. **Rate limit first**: every state-changing Server Action starts with
   `const limited = await limitAction(LIMITS.<policy>); if (limited) return limited;`
   (`@web/core/actions/limit`, `@web/core/security/rate-limit`): per user, per client IP when signed out;
   `rate_limited` + `retryAfterS` for the UI. Pick a policy in `LIMITS` or add one there (ADR 0017).
4. **Validate input on the server** with the form's zod schema (`parseInput(schema, input)`,
   `@web/core/validation`; messages are dictionary keys): types, lengths, ranges, enums, and UUIDs (`isUuid`) before
   an id goes into an API path. Treat every argument, field and hidden input as attacker-controlled;
   pass the API an object you built field by field, never the input object itself (extra fields
   like `ownerId` must not get through). Refusal → `invalidInput(...)` (`@web/core/actions/result`).
5. **Never trust money or ownership from the client**: compute prices, totals, discounts, stock
   on the server/API; take the user id from the session, never from the form.
6. **Idempotency for creates** (orders, payments): a random `submissionId` rendered into the form,
   and the action wrapped in `once('order:' + user.id + ':' + submissionId, () => …)` from
   `@web/core/actions/idempotency` (Redis `web:idem:*`, SET NX EX): a double click or a resubmit gets the first
   result back instead of creating a second order. Creates that the API must deduplicate across
   retries also pass `idempotencyKey` to `apiFetch` (and KrakenD must forward `Idempotency-Key`).
7. **Return only what the UI needs**: an `ActionResult<T>` (`@web/core/actions/result`); failures via
   `fromApiFailure(result)` → message + `requestId` + field errors, never stack traces or upstream
   payloads. Never export anything but async functions from a `'use server'` file.
8. **Cookies** only through `packages/core/src/auth/cookies.ts`: httpOnly, SameSite=Lax, `__Host-` prefix and
   Secure in production; delete with `clearCookie()` (keeps the attributes, required for `__Host-`).
9. **Behind a reverse proxy/CDN**: `APP_URL` must be the public URL. If the proxy rewrites
   `Host`, set `experimental.serverActions.allowedOrigins` in `next.config.ts`; never disable the
   checks to "make it work".
10. **Test the negative cases**: unit tests of the action with `vi.mock('@web/core/api')` (see
    `apps/admin-web/src/features/deployments/actions.test.ts`): invalid input refused without an API call, extra fields not
    forwarded, API errors mapped. Live: a POST with `Origin: https://evil.example` → 403; without
    a session → refused; a tampered price/quantity → refused or recomputed.
