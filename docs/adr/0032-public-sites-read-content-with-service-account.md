# 0032. Public sites read their published content with their own service account

- **Status:** Accepted, implemented for laundry-web in dev (2026-11-11)
- **Date:** 2026-11-11
- **Related:** 0002, 0003, 0010, 0025 (realms per site, later), 0026, 0028 (site groups), 0031,
  `web/packages/core/src/auth/service-token.ts`, `web/packages/core/src/api/site-fetch.ts`

## Context

The client sites (laundry, nails, wine…) show the articles their admins publish. No visitor signs
in to read them, but every API route is authenticated (ADR 0002) and only the web apps' servers
reach KrakenD (ADR 0003). The site's server needs a token of its own.

## Decision

- **One confidential Keycloak client per public site** (`laundry-web`, later `nails-web`…), with
  only a **service account**: no browser flow, no password grant. Its token carries the audience
  `content-api` (mapper), the role `content:read` and the group `/sites/<site id>` (ADR 0028), so
  the API answers for that site only (another site: 404; any write: 403).
- The site's SERVER gets the token with **client credentials** (`getServiceToken`, kept in memory
  until 30 s before it expires) and calls the API with `siteApiFetch` (same retries, timeouts,
  401 renewal and errors as `apiFetch`). The token never reaches the browser (ADR 0010).
- `@web/core/api` helpers for public content (`listSiteCategories`, `listPublishedArticles`,
  `getPublishedArticle`) use `siteApiFetch`; anything about a signed-in user stays on `apiFetch`.
- The pages cache what they read (`'use cache'`, `cacheLife('minutes')`): static and fast, a new
  article appears within minutes. A failed call throws and is not cached.
- Env of such a site: `API_URL`, `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
  (from a Secret outside dev). No Redis, no sessions.

## Consequences

- `content:read` also reads the site's DRAFTS (`GET .../articles`): only the site's own server
  holds the token and it only calls the published routes. A narrower role (`content:read-published`)
  is the fix if that ever matters.
- Each new site = a client + its service account in the realm (dev JSON, a kcadm step on running
  clusters) + a Secret when it is deployed. laundry-web is not deployed yet: dev realm only.
- With the realm split (ADR 0025) the client moves to the site's realm; the code doesn't change.

## Alternatives considered

- **Public (unauthenticated) KrakenD routes for published content**: breaks "every route
  authenticated twice" and opens the API to the Internet's traffic. Rejected.
- **The site reads the content database directly**: breaks service ownership of data. Rejected.
- **Build-time export to JSON**: every publish would need a rebuild of the site. Rejected.
