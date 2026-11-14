# admin-web

The admin site of the web workspace ([`web/`](../../README.md), ADR 0019): a Next.js 16 BFF like
portfolio-web (same `@web/core` and `@web/ui`), public at `admin.<domain>` but only usable by
administrators: **superadmins** (every site + system pages) and **site admins** (their own sites
only), ADR 0030.

```
Browser ──session-id cookie──▶ admin.<domain> ─▶ admin-web (Next.js server) ──Bearer──▶ KrakenD (private) ──▶ services
   └── sign-in ──▶ Keycloak, client "admin-web": password → admins only → one-time code (superadmins)
```

## Who can get in (three locks, all enforced)

| Lock | Where |
|---|---|
| Keycloak browser flow `browser-admin-otp`, bound to the client `admin-web` only: password, then **users without `admin-web:admin` are refused**, then, for `admin-web:superadmin` only, the **one-time code** (a superadmin without OTP must set it up first) | `realm.json` of each environment (`k8s/overlays/<env>/keycloak/`), applied by the Job keycloak-config (ADR 0043) |
| The app itself refuses a token without the role (`KEYCLOAK_REQUIRED_ROLE=admin-web:admin`), at sign-in AND on every token refresh: removing the role ends the session within minutes | `@web/core/auth/session` |
| Sessions: 8 h idle, 7 days at most (client settings of `admin-web`, ADR 0035; was 15 min / 8 h) | realm JSON |

Plus everything portfolio-web has: tokens only in Redis (its own ACL user, keys `admin-web:*`),
CSRF origin check, CSP, rate-limited `/auth/login`, `X-Robots-Tag: noindex`. Its own look (teal)
so an administrator always knows which site they're on.

## Run it (dev)

Requires the stack (root README): `npm run k8s:up` (also applies the sign-in flow, ADR 0043),
`npm run k8s:forward`, and `npm run start:dev` in `nest-microservice/`.

```bash
cp .env.example .env.local     # in this folder; set SESSION_ENCRYPTION_KEY (command in the file)
cd ../.. && npm install        # once, in web/
npm run dev:admin              # in web/ (npm run dev starts both sites); Next on :3100 → http://admin.localtest.me:8000
```

Sign in as **`alice`** / `password`, then the one-time code. alice has a **DEV-ONLY** OTP secret
(dev and staging realms only, never prod). Add it to an authenticator app as a manual key:

```
MRSXMLLPNZWHSLLBNRUWGZJNN52HALLTMVRXEZLU      (TOTP, SHA-1, 6 digits, 30 s)
```

or print the current code: `node -e "const c=require('crypto'),k=Buffer.from('dev-only-alice-otp-secret'),b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=c.createHmac('sha1',k).update(b).digest(),o=h[19]&15;console.log(String((h.readUInt32BE(o)&0x7fffffff)%1e6).padStart(6,'0'))"`.

Site admins (password only, no OTP): **`dana`** (Nails) and **`erin`** (Wine), password `password`.
`bob` and `carol` are refused by Keycloak right after their password (not administrators).
Staging: https://admin.staging.localtest.me (same accounts).

| Script (here, or `-w admin-web` from `web/`) | |
|---|---|
| `npm run dev` | Dev server on :3100 (the dev Gateway routes `admin.localtest.me:8000` there) |
| `npm test` / `npm run typecheck` / `npm run lint` | Vitest (dictionaries) / `next typegen` + `tsc` / ESLint |
| `docker build -f web/apps/admin-web/Dockerfile -t admin-web web` (repo root) | Production image |

## Structure

```
src/
  app/
    [lang]/            pages per language: layout, / (overview + charts), /deployments, /design-system,
                       /login, not-found
    exports/           GET /exports/deployments?search= → .xlsx (Route Handler, rate limited)
    auth/              login, callback, logout: one line each (@web/core/auth/routes)
  features/
    deployments/       schema.ts, actions.ts (+ test), deployments-table.tsx, toolbar.tsx,
                       create-deployment-dialog.tsx, search-params.ts, export.ts, overview-charts.tsx
    design-system/     showcase.tsx: every @web/ui component, live
  components/          admin header (language menu, user menu)
  i18n/                locales.ts, messages.ts, messages/<lang>.json (en = reference)
  proxy.ts             CSRF origin check, language redirect, security headers
```

Pages, text and links follow `web/.claude/rules/` (i18n, forms, api, auth). A new admin action is
a Server Action with the `/new-form` checklist; the API checks `deployment:admin` (or the relevant
role) again on every call.
