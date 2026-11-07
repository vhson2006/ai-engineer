---
paths:
  - 'apps/*/src/app/**'
  - 'packages/core/src/api/**'
  - 'packages/core/src/actions/**'
  - 'apps/*/.env.example'
---

# Calling the API (KrakenD → nest-microservice)

The API is **private**: only this app's server reaches it (dev `API_URL=http://localhost:8080`
through `npm run k8s:forward` at the repo root; prod the in-cluster KrakenD Service). The
browser never calls it and never sees a token.

- Always `apiFetch<T>(path, options)` from `@web/core/api` (server only), or a typed helper next to it
  (`listDeployments`, `createUpload`…). Never a raw `fetch` to `API_URL`, never
  `getAccessToken()` + your own `fetch`: you'd lose 401 renewal, retries, timeouts and error mapping.
- Never expose the API to the browser: no `NEXT_PUBLIC_API_URL`, no client component that
  fetches it, no Route Handler that proxies arbitrary paths to it.
- Branch on `result.ok`, then `status` / `code`. Show `message` + `requestId`, nothing else. In a
  Server Action, return `fromApiFailure(result)`.
- GET/PUT/DELETE are retried on network errors, timeouts, 502/503/504 and 429. POST/PATCH are
  not (they could run twice), unless `idempotencyKey` is set, or `idempotent: true` for a POST
  that is idempotent by design on the API side (e.g. `/api/files/:id/complete`).
- Updates send `headers: { 'If-Match': '"' + resource.revision + '"' }` (the ETag is the quoted
  revision); 412 → reload and retry,
  428 → the If-Match header is missing.
- KrakenD forwards only the query params and headers listed per endpoint (`input_query_strings`,
  `input_headers` in `k8s/base/krakend/config/krakend.tmpl`, repo root): a new one must be
  added there too, or it silently never reaches the service.
- Response types mirror `nest-microservice/libs/common/src/contracts` (`Deployment`,
  `StoredFile`…). Change them together.
- Tests: `npm test` (`api-client.test.ts` covers retries, 401 renewal, Problem Details).
