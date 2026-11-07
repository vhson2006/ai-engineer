# 0016. Content-Security-Policy from the proxy, without nonces

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** ADR 0017, `portfolio-web/src/lib/security/headers.ts`, `portfolio-web/src/proxy.ts`,
  `portfolio-web/next.config.ts`

## Context

The web app had X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy, but no
Content-Security-Policy. Sessions are httpOnly cookies, so XSS can't steal tokens, but injected
script could still act as the user (Server Actions) or send data elsewhere. Next 16 offers three
ways: nonces (strongest, but every page must render dynamically and they are incompatible with
Cache Components / partial prerendering, which this site uses for its static pages), experimental
hash-based SRI, or a header without nonces.

## Decision

- A CSP **without nonces**, set at **runtime** by `src/proxy.ts` (`lib/security/headers.ts`), from
  `APP_URL`, `KEYCLOAK_ISSUER` and `STORAGE_ORIGINS` (the production image is built once for every
  environment; `next.config` headers would freeze the origins at build time).
- `default-src 'self'`; scripts and styles only from this site, with `'unsafe-inline'` (Next's
  inline bootstrap / RSC payload); images, media and `connect-src` also from object storage
  (presigned uploads, downloads); `form-action 'self'` + Keycloak (logout POST redirects there);
  `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`; `upgrade-insecure-requests`
  on HTTPS only. Dev only: `'unsafe-eval'` (React debugging) and the HMR websocket.
- Also `Cross-Origin-Opener-Policy: same-origin`, `X-DNS-Prefetch-Control: off`,
  `Origin-Agent-Cluster: ?1`. HSTS stays at the edge (prod).

## Consequences

- Verified in Chrome: every page (signed in and out) and the logout form work with no violation;
  a foreign `<script src>`, a `fetch` to another host, a form POST to another host and an
  `<object>` are blocked.
- Inline script injection is NOT blocked (`'unsafe-inline'`): React's escaping and the absence of
  `dangerouslySetInnerHTML` remain the first defence.
- Any new external origin (fonts, analytics, CDN, iframe) must be added in `headers.ts`.
- Upgrade path: Next's SRI (`experimental.sri`) once stable, to drop `'unsafe-inline'` for scripts
  while keeping static pages.

## Alternatives considered

- **Nonces**: lose static rendering and partial prerendering for the whole site. Rejected for now.
- **SRI now**: experimental; doesn't apply in `next dev`. Deferred.
- **CSP in `next.config.ts` `headers()`**: origins frozen at build time. Rejected.
