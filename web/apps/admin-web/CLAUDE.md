@AGENTS.md

# admin-web: the admin site

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Who can sign in, dev accounts and OTP: `README.md`. Decisions: ADRs 0019, 0030.

Specific to this app:
- **Admins only, three locks**: Keycloak flow `browser-admin-otp` (non-admins refused, OTP for
  `admin-web:superadmin`; `npm run keycloak:admin-otp`), `KEYCLOAK_REQUIRED_ROLE=admin-web:admin` checked by
  `@web/core/auth/session` at sign-in and on every refresh, Keycloak sessions of 8 h idle / 7 days max (ADR 0035, interim; was 15 min / 8 h). Never remove
  or weaken one of them, and never add a page or action that works without a session.
- Keycloak client `admin-web`, Redis ACL user `admin-web` with `REDIS_KEY_PREFIX=admin-web:`,
  dev port 3100 (`http://admin.localtest.me:8000`).
- Every admin action still goes through the private API with the user's token: the services check
  the role again (e.g. `deployment:admin`). No direct database access, no service credentials here.
- **Site admins vs superadmins** (ADR 0030): the side menu shows the sites `GET /api/content/sites`
  returns (the API filters them) and the system pages only to `admin-web:superadmin`
  (`isSuperadmin`). Hiding a link is display only: every page and action relies on the API's 403/404.
- Pages under `src/app/[lang]/`; all text in `src/i18n/messages/<lang>.json` (en and vi).
- Not indexed (`X-Robots-Tag: noindex` in `next.config.ts`, `robots` metadata): keep both.
- Its own brand color (teal, `src/app/globals.css`): keep it distinct from portfolio-web.
