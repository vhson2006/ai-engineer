# 0004. Keycloak: only the app realm is public; admin through port-forward

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** 0025 (a public realm per client site + one admin realm; `master` stays private), `.claude/rules/infrastructure.md`, `k8s/base/gateway/routes.yaml`,
  `k8s/scripts/keycloak-admin-url.sh`, `k8s/README.md` (prod bootstrap step 8)

## Context

The browser must reach Keycloak to sign in: Authorization Code flow means the password is typed
on Keycloak's page, never on ours (SSO across sites, MFA, social login, no password in the web
app). But the admin console and realm `master` hold full control of every user and client.

When `auth.*` was narrowed to the app realm, the admin console (at `KC_HOSTNAME_ADMIN`,
`localhost:8180` through port-forward) stopped working: its own login runs on realm `master`,
which Keycloak addressed at the public `KC_HOSTNAME`, where the Gateway answers 404.

## Decision

- The Gateway publishes only `/realms/nest-microservice` and `/resources` on `auth.*`.
  `/admin`, `/realms/master`, management (:9000) are never published.
- Admins use `kubectl port-forward svc/keycloak 8180:8080` → `http://localhost:8180/admin`
  (dev: part of `npm run k8s:forward`).
- Realm `master` has its own **Frontend URL = `http://localhost:8180`**, so its login also runs on
  the private address. Set once per fresh cluster with `npm run keycloak:admin-url` (stored in
  Keycloak's database; the app realm, its tokens and issuer are untouched).
- Prod: named admins in `master` with OTP required, bootstrap admin removed (after running
  `keycloak:admin-url`, which needs it).
- Brute-force detection on both realms (5 failures → temporary lockout up to 15 min, never
  permanent): app realm in the realm JSON, `master` through `keycloak:admin-url` (2026-11-06).

## Consequences

- Reaching the admin console requires cluster credentials (kubeconfig); nobody on the Internet
  can even see its login page.
- One extra bootstrap step per new cluster; forgetting it makes the console hang (documented).
- The app realm's login page is public: brute-force detection is on; a per-IP rate limit at the
  edge is a follow-up (ADR 0017).

## Alternatives considered

- **Password grant / our own login form**: removed from OAuth 2.1, loses SSO and MFA, the web app
  would handle passwords. Rejected.
- **Publish the admin console behind IP allow-listing or basic auth**: still an Internet-facing
  admin login. Rejected; a VPN (Tailscale) may replace the port-forward later (on hold).
- **Publish realm `master` on `auth.*`**: exposes the admin realm's login to the Internet. Rejected.
