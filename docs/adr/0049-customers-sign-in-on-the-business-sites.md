# 0049. Customers sign in on the business sites: a realm per site, the kit's BFF session

- **Status:** Accepted, implemented (dev, staging; prod runs no site yet). The API does not accept
  customers' tokens yet: nothing a customer does calls it. Registration, recovery, Google and
  passkeys: ADR 0050.
- **Date:** 2026-11-14
- **Related:** 0025 (a realm per site for customers: this implements its sign-in part), 0010
  (tokens never in the browser), 0019 (the shared OIDC handlers), 0032 (the sites' service
  accounts), 0043 (Keycloak as code), 0045/0047 (the kit, the sites in Kubernetes)

## Context

ADR 0025 chose one Keycloak realm per site for its customers, so a customer of one business is
never signed in to another and each site can have its own `bob`. Until now the sites had no
sign-in at all: their Keycloak client (`<id>-web`, realm `nest-microservice`) is only a service
account that reads the site's articles. portfolio-web and admin-web already sign in with the shared
handlers of `@web/core` (Authorization Code + PKCE, tokens sealed in Redis, an httpOnly cookie).

## Decision

- **Keycloak**: realm `site-<id>` per site (`k8s/sites/<id>/keycloak/customers-<id>.json`, applied
  by the Job keycloak-config in every environment that runs the site): the site's name and
  languages, the same brute-force detection as the staff realm, sessions 1 day idle / 7 days max,
  and client `<id>-web` (confidential, PKCE S256, redirect `<ID>_URL/auth/callback`). The client has the same id and secret as the site's service account in `nest-microservice`: one
  app, one secret (`<ID>_WEB_CLIENT_SECRET`).
- **Public paths**: the `auth.*` route publishes `/realms/nest-microservice` and `/realms/site-*`
  (plus `/resources`); `/admin` and `/realms/master` stay private. Customers sign in at
  `auth.<domain>/realms/site-<id>` until a site has its own domain (ADR 0025's own Frontend URL).
- **Web, once in the kit**: `site.routes.authLogin / authCallback / authLogout` (the `@web/core`
  handlers), `site.routes.login` and `site.routes.account` (never indexed), and `AccountLink` in the
  header ("Sign in", or the customer's first name). Every site re-exports them
  (`npm run check:sites`). The header reads the session inside a `<Suspense>`: pages stay
  prerendered, only that link is streamed.
- **Env of a site**: `KEYCLOAK_ISSUER` = its customers' realm; `API_KEYCLOAK_ISSUER` = the realm the
  API trusts (its service account, renamed from `KEYCLOAK_ISSUER`); `REDIS_URL` (its own Redis /
  Valkey ACL user, keys `<id>-web:*` only), `REDIS_KEY_PREFIX`, `SESSION_ENCRYPTION_KEY`. In
  Kubernetes the template builds `KEYCLOAK_ISSUER` from `AUTH_URL` and reads Secret `<id>-web`.
- **Test customers** (dev, staging only, `components/keycloak-local/test-customers-<id>.json`): `bob`
  and `carol` in each of the nine realms, password `Dev-Staging-2026!`; applied only where the site's
  realm exists.

## Consequences

- A site in an environment also needs Secret `<id>-web` (REDIS_URL, SESSION_ENCRYPTION_KEY) and,
  in prod, a Valkey user for it.
- Signing in identifies a customer and nothing more: the first feature that needs it (orders,
  bookings) makes the API accept the site realms' tokens (KrakenD and `AuthGuard`, the site taken
  from the token's issuer, ADR 0025) in the same change.
- In dev every site runs on `localhost:<port>`: browsers share cookies across ports, so signing in on
  one site signs you out of another (staging and prod have a host per site).

## Alternatives considered

- **Customers in the staff realm** (a group per site): one `bob` for every site, and a customer of
  one business signed in to all. Rejected by ADR 0025.
- **A sign-in page per site**: nine copies. Rejected: the kit's routes.
