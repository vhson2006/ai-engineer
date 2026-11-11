# Code review checklist (humans and AI)

Use this for every PR, and when an AI agent self-reviews before calling a task done. The rules
behind each item are in `CLAUDE.md` and `.claude/rules/` (`forms.md`, `api.md`, `auth.md`,
`files.md`).

## Checklist

**Architecture (BFF)**
- [ ] Only server code calls the API, always through `apiFetch` (`@web/core/api`) or a typed helper next to it. No raw `fetch` to `API_URL`, no `getAccessToken()` + own `fetch`.
- [ ] The API stays private: nothing calls it from the browser, no `NEXT_PUBLIC_API_URL`, no Route Handler that proxies arbitrary paths to it.
- [ ] Response types mirror nest-microservice `libs/common/src/contracts`; a new query param or header is also listed for that endpoint in KrakenD (`input_query_strings` / `input_headers`).

**Mutations (forms, Server Actions, Route Handlers)**
- [ ] Server Action by default; a Route Handler only for external callers. Nothing changes state on GET.
- [ ] CSRF: `apps/<app>/src/proxy.ts` still covers the path; a state-changing Route Handler starts with `rejectCrossSite()`.
- [ ] The session is re-checked inside the action/handler.
- [ ] Every argument is validated on the server; the API body is built field by field (no spread of the input); ids from the client pass `isUuid()` before going into an API path.
- [ ] Ids of the user, prices, totals and ownership never come from the client.
- [ ] Every state-changing Server Action starts with `limitAction(...)` (rate limit per user).
- [ ] Creates are wrapped in `once()` with a per-user scope and a form `submissionId`; updates send only the changed fields.
- [ ] Actions return an `ActionResult` (`fromApiFailure` / `invalidInput`); `'use server'` files export only async functions.

**Sessions and auth**
- [ ] Tokens never reach the browser (not in props, HTML, client components or logs). Secrets in Redis are sealed under a hashed key.
- [ ] Refresh goes only through `refreshSession()`; only `invalid_grant` signs a user out.
- [ ] Redirects use `appUrl()`; `returnTo` goes through `safeReturnTo()`. Cookies only via `packages/core/src/auth/cookies.ts`.
- [ ] Redis usage fits the `web` ACL (keys `web:*`, GET/SET/DEL/GETDEL/INCR/EXPIRE/PING). Redis or Keycloak down → a friendly message, never a bare 500.

**Files**
- [ ] File bytes never go through a Server Action, a Route Handler or the API (presigned upload/download only).
- [ ] Pages link private files with `fileDownloadPath(id)`, never with an expiring `StoredFile.url`.

**Security headers**
- [ ] CSP still comes only from `packages/core/src/security/headers.ts` via the proxy; any new origin is explicit (no `*`, no new script host, no `'unsafe-eval'` in prod); no CORS added.

**Errors and UI**
- [ ] Users see `message` + `requestId`, never stack traces, upstream payloads or internal hostnames.
- [ ] Pages that read the session stream behind `<Suspense>` (Cache Components); public pages stay static.

**Tests**
- [ ] New server logic and actions have unit tests (`apps/*/src/**/*.test.ts`, `packages/core/src/**/*.test.ts`), including the negative cases: invalid input refused without an API call, extra fields not forwarded, signed out refused, API errors mapped, duplicate submission.
- [ ] `npm test`, `npm run typecheck` and `npm run lint` (from web/) pass. Mutations were also checked live: `Origin: https://evil.example` → 403.

**Docs**
- [ ] `CLAUDE.md`, `.claude/rules/*` and the `/new-form` skill still describe the code. Update them in the same PR if a convention changed.

## Reporting findings

Group by severity, most severe first. Give each finding a `file:line`, what goes wrong in a
concrete scenario, and the rule it breaks.

1. **Critical**: a token, session id or secret reaching the browser or the logs; the API called from (or exposed to) the browser; a mutation without the CSRF origin check, without a session re-check, or on GET; user id, price or ownership taken from client input; an open redirect; file bytes proxied through Next.js; a user signed out on a temporary failure.
2. **Should fix**: missing server-side validation of a field, input spread into an API body, a create without `once()` a raw `fetch` to the API, upstream details shown to users, a bare 500 when Redis/Keycloak is down, missing tests.
3. **Suggestion**: readability or naming improvements that don't block merging.
