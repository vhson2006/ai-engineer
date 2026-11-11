# 0019. Web apps in one npm workspace with shared packages; the admin site is a separate, public app

- **Status:** Accepted, implemented
- **Date:** 2026-11-07
- **Related:** amended by 0030 (site admins sign in too, OTP for superadmins only); 0025 (the admin site serves every client site, admins in one admin realm), 0002, 0003, 0004, 0010, 0013, 0015, 0016, 0017, 0020, `web/CLAUDE.md`,
  `web/.claude/rules/`, `web/apps/admin-web/README.md`, `k8s/scripts/keycloak-admin-otp.sh`

## Context

An admin site is needed with the same architecture as the user site (BFF, server-side sessions,
CSRF, CSP, rate limits, presigned uploads) and the same components. Copying portfolio-web would
mean every security fix twice and two copies drifting apart. Putting admin pages inside
portfolio-web would share its cookies, CSP, deployment and network rules: one XSS on the user
site would reach admin rights, and admin could never get stricter settings. Turbopack only
resolves and watches files under its root, so a workspace rooted at the repository root would
also watch `nest-microservice/` and its `node_modules`.

## Decision

- `web/` is an **npm workspace** (one `package-lock.json`): `apps/portfolio-web` (user site),
  `apps/admin-web` (admin site), and shared **TypeScript-source packages** without a build step:
  `@web/core` (API client, sessions/OIDC and the `/auth/*` Route Handlers, CSRF, CSP, rate
  limits, Server Action helpers, uploads, i18n) and `@web/ui` (UI primitives, language menu, nav,
  design tokens). Turbopack root and `outputFileTracingRoot` = `web/`. Images build with context
  `web/`.
- Shared code lives only in `packages/`; an app keeps its pages, content, `proxy.ts`, config and
  dictionaries. App differences come from env: `KEYCLOAK_CLIENT_ID`, `REDIS_KEY_PREFIX`,
  `KEYCLOAK_REQUIRED_ROLE`.
- The agent rules, the `/new-form` skill and the review checklist live once in `web/`.
- **admin-web**: its own Deployment, host `admin.<domain>`, **public (no VPN)**, locked three ways:
  1. Keycloak browser flow `browser-admin-otp`, bound to the client `admin-web` only: password,
     then users without the client role `admin-web:admin` are **refused** ("Deny access"), then a
     **one-time code is required** (admins without OTP must enrol). Created by
     `npm run keycloak:admin-otp` (admin API; a partial realm JSON can't add flows).
  2. The app re-checks the role (`KEYCLOAK_REQUIRED_ROLE`) at sign-in and on every token
     refresh; a refused sign-in also ends the Keycloak session.
  3. Short sessions (client settings: 15 min idle, 8 h max).
  Plus: its own confidential client, cookies on its own host, its own Redis ACL user and keys
  (`admin-web:*`), the same CSRF/CSP/rate limits, `X-Robots-Tag: noindex`, a distinct look. It
  calls the private API like portfolio-web (NetworkPolicy `krakend-from-web`); the services
  authorize every call again (ADR 0002). This widens ADR 0003's public surface by one host.

## Consequences

- A fix in `@web/core` reaches every app at once; no app copies auth or security code.
- Each Dockerfile lists every workspace `package.json` in its `deps` stage (npm ci needs them).
- `npm run keycloak:admin-otp` is a bootstrap step of every fresh cluster (dev, staging, prod),
  like `keycloak:admin-url`; `staging:up` runs both.
- Non-admins are refused before the OTP step, so trying the admin site never enrols them in OTP
  (which would then apply to their portfolio-web sign-ins too). Admins with OTP get the code
  prompt on portfolio-web as well (the default flow asks it of users who have OTP).
- Public admin login is an attack target: OTP, brute-force detection and rate limits are
  mandatory, not optional. A VPN or IP allow-list can be added later without changing the app.
- Dev: admin-web runs on the host on :3100 (`admin.localtest.me:8000`); the dev realm gives
  `alice` a fixed, dev-only OTP secret so the flow can be tested (never in the prod realm).

## Alternatives considered

- **Admin pages inside portfolio-web**: shared cookies, CSP and blast radius. Rejected.
- **Copy portfolio-web**: drift and double maintenance of security code. Rejected.
- **Workspace rooted at the repository root**: Turbopack would watch `nest-microservice/`.
  Rejected for `web/`.
- **Turborepo / Nx**: not needed for two apps; can be added on top of npm workspaces later.
- **Admin only through a VPN**: safer, but the user chose a public admin site with strong login.
- **OTP only in the app (step-up after sign-in)**: Keycloak already does OTP well (enrolment,
  brute-force protection); the app checking `acr`/`amr` adds little for this setup. Rejected.
- **Role check only in the app**: non-admins would pass Keycloak's OTP enrolment first. Rejected.
