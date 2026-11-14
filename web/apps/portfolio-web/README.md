# portfolio-web

The user site of the web workspace ([`web/`](../../README.md), ADR 0019): personal website (Home, About) with a Keycloak-protected **Dashboard** that lists deployments from
the `nest-microservice` API.

Next.js 16 (App Router, Cache Components) · React 19 · Tailwind CSS 4 · openid-client · Redis sessions.

```
Browser ──cookie (session id only)──▶ www.localtest.me:8000 ─▶ Next.js server ──Bearer token──▶ KrakenD (private: localhost:8080 via k8s:forward / in-cluster Service) ──▶ deployment-service
   │                                                            │  tokens kept in Redis
   └──── login / logout ────▶ auth.localtest.me:8000 (Keycloak) ◀── code exchange (back channel, PKCE + client secret)
           (all three hosts: the edge Gateway in k8s/base/gateway, repo root)
```

## Run it

Requires the stack (see the root README): at the repo root `npm run k8s:up` (edge Gateway,
KrakenD, Keycloak...) and `npm run k8s:forward` (Redis :6379, KrakenD :8080), and
`npm run start:dev` in `nest-microservice/`.

```bash
cp .env.example .env.local   # already done once (in this folder)
cd ../.. && npm install      # once, in web/: installs the whole workspace
npm run dev                  # in web/ (or here): open http://www.localtest.me:8000 (edge Gateway -> :3000)
```

Sign in with `carol` (read), `bob` (read + write own) or `alice` (admin), password `password`.

| Script | |
|---|---|
| `npm run dev` | Dev server on :3000, opened at http://www.localtest.me:8000 (`APP_URL`, the Keycloak redirect URI). Must stay :3000: the Gateway routes there |
| `npm run build && npm start` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) of this app (`src/**/*.test.ts`); the shared code is tested in `packages/core` (`npm test` in `web/` runs all) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `docker build -f web/Dockerfile --build-arg APP=portfolio-web --build-arg SITE_URL=https://www.<domain> -t portfolio-web web` (repo root) | Production image (`output: 'standalone'`, non-root, config from env at runtime). Deployed by `k8s/overlays/prod` (repo root) |

## Edit the content

**Text** (UI and personal content: role, tagline, bio, skills, experience…) is in one JSON file per
language: [`src/i18n/messages/en.json`](src/i18n/messages/en.json) and
[`vi.json`](src/i18n/messages/vi.json), section `"profile"` for the personal part. Change every
language. **Language-independent data** (name, initials, email, phone, links) is in
[`src/content/profile.ts`](src/content/profile.ts). Values in «angle quotes» are placeholders;
empty lists hide their section.

The look is controlled by the shared color tokens in [`packages/ui/src/theme.css`](../../packages/ui/src/theme.css)
(light and dark), imported by [`src/app/globals.css`](src/app/globals.css). Override `--brand` in
`globals.css` to re-color only this site.

## Languages

English and Vietnamese (ADR 0020). URLs carry the language: `/en`, `/vi/about`… `/` (or any page
path without a language) redirects to the language they last chose (cookie `NEXT_LOCALE`), else
Vietnamese (the browser's language is not used: `detectLanguage: false` in `src/i18n/locales.ts`). The globe menu in the
header switches language on the same page, keeping the query string and the scroll position.

Add a language: copy `en.json` to `src/i18n/messages/<code>.json` and translate it, add the code
to `LOCALES` in [`src/i18n/locales.ts`](src/i18n/locales.ts) and a loader in
[`src/i18n/messages.ts`](src/i18n/messages.ts), and the file to `messages.test.ts`. TypeScript and
the tests refuse missing or extra keys. Rules for code: `web/.claude/rules/i18n.md`.

## SEO and link previews (ADR 0021)

| What | Where |
|---|---|
| Title, description, canonical, `hreflang` (en, vi, x-default), Open Graph, Twitter card | `publicPageMetadata()` in [`src/seo.ts`](src/seo.ts), exported by every public page |
| `/sitemap.xml` (every public page × language, with hreflang), `/robots.txt` | [`src/app/sitemap.ts`](src/app/sitemap.ts), [`src/app/robots.ts`](src/app/robots.ts); public pages listed in [`src/site.ts`](src/site.ts) |
| Structured data (schema.org JSON-LD): WebSite, Person, ProfilePage | `structuredData()` in `src/seo.ts` |
| Link preview image per language (1200×630) | [`src/app/[lang]/opengraph-image.tsx`](src/app/[lang]/opengraph-image.tsx) |
| Icons: `icon.svg`, `favicon.ico`, `apple-icon.png`, manifest PNGs, `manifest.webmanifest` | edit [`src/app/icon.svg`](src/app/icon.svg) / `assets/icon-maskable.svg`, then `npm run icons` in `web/` |
| Sign-in and dashboard | `noindex, nofollow` |

The public origin is **baked at build time**: `SITE_URL` (Docker `--build-arg SITE_URL=...`,
required; local builds use `APP_URL`). After changing the domain, rebuild. Check a build:
`npm run build -w portfolio-web`, then `/en`, `/sitemap.xml`, `/robots.txt`, `/en/opengraph-image`.
After going live: submit `https://www.<domain>/sitemap.xml` in Google Search Console.

## How authentication works

| Route | What it does |
|---|---|
| `GET /auth/login?returnTo=/dashboard` | Creates state, nonce and a PKCE verifier (kept in Redis, 10 min), redirects to Keycloak |
| `GET /auth/callback` | Checks state/nonce, exchanges the code with the client secret, stores the tokens in Redis, sets the `pw_session` cookie |
| `POST /auth/logout` | Deletes the Redis session and ends the Keycloak SSO session (`end_session` with `id_token_hint`) |

- The browser only gets an **httpOnly, SameSite=Lax cookie with a random session id**. Access,
  refresh and id tokens stay on the server (Redis), so XSS can't steal them.
- The access token is refreshed automatically 30 s before it expires (`@web/core/auth/token-refresh.ts`):
  - **once per request**: header, page and API calls of one render share it (React `cache`);
  - **once across requests, tabs and replicas**: a 10 s lock per session in Redis
    (`web:session-refresh:*`, `SET NX PX`); the others wait for the saved result. That's what
    makes refresh-token **rotation** safe (enabled in the realm: a stolen refresh token that is
    used twice is detected by Keycloak and revoked);
  - only **`invalid_grant`** (logged out elsewhere, revoked, user disabled, SSO idle/max timeout)
    ends the session. Keycloak unreachable / slow (5 s timeout) / 5xx keeps the session: the
    still-valid token is used, or, once expired, API calls answer 503 `auth_unavailable`
    ("try again") while the user stays signed in.
- API calls go through **`apiFetch()`** (`@web/core/api` → `packages/core/src/api/client.ts`), never a raw
  `fetch`: Bearer token, `X-Request-Id` (same on every retry; errors on the dashboard show it,
  and it's the `requestId` in the API's logs), 8 s timeout per attempt, retries with backoff and
  jitter only for idempotent methods (or an `idempotencyKey`) on network errors, timeouts,
  502/503/504 and 429 (`Retry-After` honoured), a 401 renews the token once and repeats, and
  Problem Details become `{ ok: false, status, code, message, errors, requestId }`. It never
  throws for HTTP/network problems.
- `returnTo` only accepts relative paths (no open redirect). Logout is a POST.

### Files (upload and download)

The bytes never go through Next.js or KrakenD: the browser sends them straight to object storage
(SeaweedFS in dev, S3 / Spaces / R2 in prod) with a presigned URL, and downloads come from there.

```
Upload   browser ──startUpload()──▶ Server Action ──apiFetch──▶ POST /api/files/uploads   (presigned PUT)
         browser ──PUT bytes (XHR, progress)──────────────────▶ storage                  (signed type + size)
         browser ──finishUpload()─▶ Server Action ──apiFetch──▶ POST /api/files/:id/complete (API verifies)
Download <a href="/files/<id>/download"> ──▶ route: GET /api/files/:id/download-url ──302──▶ storage
```

- Client components: `useFileUpload(purpose)` / `uploadFile()` (`features/files/use-file-upload.ts`),
  `removeFile()` (`features/files/actions.ts`), `fileDownloadPath(id)` (`@web/core/files/`).
- Server: `createUpload`, `completeUpload`, `getFile`, `listFiles`, `deleteFile`,
  `getDownloadLink` in `@web/core/api`.
- The storage must allow the web origin in CORS (dev: `-s3.allowedOrigins` of SeaweedFS in
  nest-microservice); in prod, set the bucket CORS to `APP_URL` with `PUT` + `Content-Type`.

### Rate limits

Fixed-window counters in Redis (`@web/core/security/rate-limit`, shared by every replica, fail open):
`/auth/login` 10 per 5 min per client IP (`X-Real-IP` from the edge) → `/login?error=rate_limited`;
Server Actions per user through `limitAction()` (uploads 30 / 5 min, other mutations 60 / 5 min) →
`rate_limited`. The API is limited again by KrakenD (per endpoint and per token). ADR 0017.

### Security headers

`src/proxy.ts` adds, at runtime from env, a **Content-Security-Policy** and `Cross-Origin-Opener-Policy`,
`X-DNS-Prefetch-Control`, `Origin-Agent-Cluster` (`@web/core/security/headers.ts`); `next.config.ts` adds the
static ones (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy); the edge adds HSTS in prod.
The CSP has no nonce (ADR 0016: nonces would make every page dynamic): scripts and styles from this
site only (`'unsafe-inline'` for Next's inline bootstrap), images / uploads / downloads also from
`STORAGE_ORIGINS`, forms only to this site and Keycloak, no plugins, no framing, `'unsafe-eval'` and
the HMR websocket in dev only.

### CSRF

| Layer | Blocks |
|---|---|
| Cookie `SameSite=Lax` | Other sites posting with the user's cookie |
| [`src/proxy.ts`](src/proxy.ts) + [`@web/core/security/csrf`](../../packages/core/src/security/csrf.ts): POST/PUT/PATCH/DELETE must carry `Origin` = `APP_URL` (or `Sec-Fetch-Site: same-origin`), else **403** | Sibling subdomains (same *site*, so Lax doesn't help), `Origin: null`, old browsers, non-browser clients |
| `rejectCrossSite()` again inside each state-changing Route Handler | A matcher change silently dropping the proxy check |
| Next.js' own Origin/Host check on Server Actions | Same, for Server Actions |
| Production cookie names `__Host-pw_session`, `__Host-pw_auth_txn` | A subdomain setting or overwriting our cookies |

Rules for new forms (orders, bookings…) are in [.claude/rules/forms.md](.claude/rules/forms.md); step by step: the `/new-form` skill ([.claude/skills/new-form](.claude/skills/new-form/SKILL.md)).

### What's in Redis, and why reading it isn't enough

| Protection | Against |
|---|---|
| Redis ACL user `web` (`REDIS_URL`): keys `web:*` only, `GET/SET/DEL/GETDEL/INCR/EXPIRE/PING` only | Other apps reading or wiping sessions; `KEYS`, `FLUSHALL`, `CONFIG` |
| Key = `web:session:<sha256(session id)>` | Turning a key name into a valid cookie |
| Value = AES-256-GCM (`SESSION_ENCRYPTION_KEY`), key name as AAD | Reading tokens from Redis/RedisInsight/backups, tampering, moving a value to another key |

Same for the login transaction (`web:auth-txn:*`, holds the PKCE verifier). Rotating
`SESSION_ENCRYPTION_KEY` signs everybody out (old values can't be decrypted and are ignored).
After changing `REDIS_URL`, restart `npm run dev`: the Redis connection is kept across hot reloads.

## Structure

```
src/
  app/
    [lang]/            pages per language: layout, / , /about, /login, /dashboard, not-found
    auth/, files/      Route Handlers (not localized): /auth/*, /files/[id]/download
  features/
    files/             Server Actions (+ test) and the useFileUpload hook
  components/          header (static, language menu) + user menu (streams in), footer
  i18n/                locales.ts (languages, routing), messages.ts (getMessages), messages/<lang>.json
  content/profile.ts   language-independent personal data (name, contacts)
  proxy.ts             CSRF origin check, language redirect, security headers on every request

Shared with the other web apps (web/packages, ADR 0019):
  @web/core            ../../packages/core/src
    api/               the API, server only: apiFetch (fetch.ts) on top of client.ts, types.ts,
                       one file per resource (deployments.ts, files.ts); import '@web/core/api'
    auth/              sessions and tokens: session.ts, token-refresh.ts, oidc.ts, cookies.ts,
                       safe-redirect.ts
    actions/           building blocks for Server Actions: result.ts, idempotency.ts (once), limit.ts
    files/             shared with the browser: index.ts (types, purposes, checks, links), upload.ts
    security/          csrf.ts, sealed.ts, headers.ts (CSP), rate-limit.ts
    server/            env.ts (validated env), redis.ts (connection)
    i18n/              negotiate.ts (Accept-Language), routing.ts (proxy redirect + cookie), format.ts
  @web/ui              ../../packages/ui/src: UI primitives (index.tsx), language menu (locale-switcher.tsx), design tokens (theme.css)
```

Tests sit next to the code they test (`*.test.ts`).

Home and About are prerendered static HTML. Anything that reads the session (user menu, login
state, dashboard) streams in behind a `<Suspense>` boundary, as Cache Components requires.
