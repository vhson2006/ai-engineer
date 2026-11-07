# web: rules for agents (Next.js BFF apps + shared packages)

npm workspace (ADR 0019): the Next.js 16 **BFF** apps in front of the nest-microservice API, and
the code they share. Run everything from this folder.

| Path | What | Own instructions |
|---|---|---|
| `apps/portfolio-web/` | The user site (www.*) | `apps/portfolio-web/CLAUDE.md` |
| `apps/admin-web/` | The admin site (admin.*): admins only, password + OTP | `apps/admin-web/CLAUDE.md` |
| `packages/core/` (`@web/core`) | BFF core: API client, sessions/OIDC and the `/auth/*` Route Handlers, CSRF, CSP, rate limits, Server Action helpers, uploads, i18n routing | the rules below |
| `packages/ui/` (`@web/ui`) | Design system (ADR 0022): shadcn/ui-style components on Radix, one per file (`@web/ui/button`, `/dialog`, `/form`, `/data-table`…), design tokens (`theme.css`) | `.claude/rules/ui.md` |

```
Browser ──session-id cookie only──▶ Next.js server ──Bearer token──▶ KrakenD (PRIVATE) ──▶ services
   ├── login/logout ──▶ Keycloak (auth.*, app realm only)
   └── file bytes ────▶ object storage (presigned URLs)
```

## Non-negotiables (every app and package)

1. **Tokens never reach the browser.** Sessions are an httpOnly cookie holding a random id;
   tokens are sealed in Redis. Only server code calls the API, always through `apiFetch` (`@web/core/api`).
2. **The API is private.** Never call it from client code, never add `NEXT_PUBLIC_API_URL`, never
   proxy arbitrary paths to it. The browser talks only to the app, Keycloak (login) and storage.
3. **Every mutation follows the forms checklist** (`.claude/rules/forms.md`): Server Action,
   CSRF origin check, session re-checked inside, server-side validation, nothing trusted from the
   client (ids, prices, owner), idempotent creates (`once()`), `ActionResult` without upstream
   details. Use the `/new-form` skill.
4. **File bytes never go through Next.js or the API**: presigned upload/download (`useFileUpload`,
   `fileDownloadPath`).
5. **Never sign users out on a temporary failure**: only `invalid_grant` ends a session
   (`packages/core/src/auth/token-refresh.ts`).
6. **Never log tokens, cookies, request bodies or token-request error objects.**
7. **Security headers come from each app's `src/proxy.ts` + `@web/core/security/headers`** (CSP,
   COOP…, ADR 0016), computed at runtime from env. A new external origin (fonts, analytics, a CDN,
   an iframe) is added there explicitly, never with a wildcard; never `'unsafe-eval'` outside dev.
   No CORS anywhere (same origin; the API is private).
8. **Every visible string is translated** (ADR 0020, `.claude/rules/i18n.md`): pages under
   `app/[lang]`, text in `src/i18n/messages/<lang>.json` (all languages in the same change),
   internal links through `href(locale, path)`.
9. **One UI stack** (ADR 0022): components from `@web/ui`, forms with react-hook-form + a zod schema
   shared with the Server Action, tables with `@web/ui/data-table`, list state in the URL (nuqs).
   No other component library, CSS-in-JS, Redux or client data cache.
10. **Shared code lives in `packages/`, never copied between apps.** Something two apps need goes to
   `@web/core` (server/BFF logic) or `@web/ui` (components, tokens). An app keeps only its pages,
   its content, its `proxy.ts`/config. Packages never import from an app.

## Where the details are

Path-scoped rules load automatically from `.claude/rules/`: `forms.md` (pages, actions,
components), `ui.md` (design system, app structure, URL state), `i18n.md` (languages),
`seo.md` (metadata, sitemap, icons), `api.md` (calling the API), `auth.md` (sessions, tokens,
Keycloak, Redis), `files.md` (uploads/downloads). Skill: `/new-form`. Review checklist and finding format:
`docs/ai/code-review.md`. What may be pasted into AI tools: `docs/ai/ai-usage-policy.md` at the repo root.

**Monorepo** (ADR 0015): `web/` sits next to `nest-microservice/` and `k8s/`. The root `CLAUDE.md`
has the system map and the cross-cutting rules; `k8s/...` and `docs/adr/...` paths mean the root
folders. Other paths here are relative to `web/`.

**Packages are TypeScript source** (no build step): Turbopack compiles workspace packages; each
package's `exports` map is its public API (`@web/core/api`, `@web/core/auth/session`…). Tailwind
scans `packages/ui/src` through the app's `@source` in `globals.css`.

```bash
npm install                    # once: the whole workspace (one package-lock.json here)
npm run dev                    # ALL apps, prefixed logs (scripts/dev.mjs); Ctrl+C stops them all
                               #   portfolio-web :3000 → http://www.localtest.me:8000
                               #   admin-web     :3100 → http://admin.localtest.me:8000
npm run dev:portfolio          # one app (or: npm run dev -- admin-web)
                               # (needs: root npm run k8s:up + k8s:forward, nest-microservice start:dev)
npm test                       # Vitest in every workspace
npm run check                  # typecheck (next typegen + tsc) + lint + test, all workspaces
npm run build -w portfolio-web # one app
npm run icons                  # after editing an app's icon.svg: favicon.ico, apple-icon, manifest PNGs
```

Docker images build with context `web/` (`docker build -f web/apps/<app>/Dockerfile ... web`): a
new package's `package.json` must be added to each app's Dockerfile `deps` stage.

## Keep this file true

If a convention changes, update this file and the matching `.claude/rules/*.md` in the same
change. A rule that doesn't match the code is worse than no rule.
