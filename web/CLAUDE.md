# web: Next.js BFF apps + shared packages

npm workspace (ADR 0019); run everything from this folder. The root `CLAUDE.md` has the system
map and the system non-negotiables (private API, tokens never in the browser, file bytes to
storage); paths here are relative to `web/`, except `k8s/...` and `docs/adr/...`.

| Path | What | Instructions |
|---|---|---|
| `apps/portfolio-web/` | User site (www.*) | its `CLAUDE.md` |
| `apps/admin-web/` | Admin site (admin.*): admins + OTP | its `CLAUDE.md` |
| `apps/nails-web/`, `apps/wine-web/`, `apps/laundry-web/` | Client sites: hard-coded facts, articles from the API (each with its own service account); no sign-in, not deployed | their `CLAUDE.md` |
| `packages/core/` (`@web/core`) | API client, sessions/OIDC + `/auth/*` handlers, CSRF, CSP, rate limits, Server Action helpers, uploads, i18n | rules below |
| `packages/ui/` (`@web/ui`) | Design system (ADR 0022): one component per file, tokens in `theme.css` | `.claude/rules/ui.md` |
| `packages/video/` (`@web/video`) | Video studio compositions (Remotion, ADR 0039): rendered by render-worker, previewed in admin-web | ADR 0039 |
| `apps/render-worker/` | Renders the studio's MP4s (JetStream consumer, headless Chrome); not Next.js | ADR 0039, its `.env.example` |

## Non-negotiables (details in `.claude/rules/`, loaded by path)

1. **Only server code calls the API, through `apiFetch`** (`@web/core/api`); no
   `NEXT_PUBLIC_API_URL`, no proxying arbitrary paths. (`api.md`)
2. **Every mutation follows the forms checklist** (`forms.md`, skill `/new-form`): Server
   Action, CSRF origin check, session re-checked, zod on the server, nothing trusted from the
   client, `once()` for creates, `ActionResult` without upstream details.
3. **Sessions** (`auth.md`): only `invalid_grant` ends one; never log tokens, cookies, bodies or
   token-request error objects.
4. **Security headers from each app's `src/proxy.ts` + `@web/core/security/headers`** (ADR 0016):
   a new external origin (fonts, analytics, CDN, iframe: `frameOrigins`) is added explicitly, never a wildcard; no `'unsafe-eval'` outside dev; no CORS.
5. **Every visible string is translated** (ADR 0020, `i18n.md`), in every language in the same change.
6. **One UI stack** (ADR 0022, `ui.md`): `@web/ui`, react-hook-form + zod, `@web/ui/data-table`,
   URL state with nuqs; no other component library, CSS-in-JS, Redux or client data cache.
7. **Shared code lives in `packages/`**, never copied between apps; packages never import an app.

Other rules: `seo.md`, `files.md`. Review checklist: `docs/ai/code-review.md`.

## Commands

```bash
npm install                    # once, the whole workspace
npm run dev                    # every app: portfolio :3000 → www.localtest.me:8000, admin :3100 →
                               # admin.localtest.me:8000, nails :3200, wine :3300, laundry :3400
npm run dev -w render-worker   # the video studio's renderer (NATS + storage of the dev stack; .env.local)
npm run dev:portfolio          # one app (dev:admin, dev:nails, dev:wine, dev:laundry); portfolio and
                               # admin need the stack (root k8s:up + k8s:forward, API start:dev)
npm run check                  # typecheck + lint + test, all workspaces
npm run build -w <app>
npm run icons                  # after editing an app's icon.svg
```

Packages are TypeScript source (Turbopack compiles them; each `exports` map is the public API;
Tailwind scans `packages/ui/src` via `@source`). Docker images build with context `web/`: a new
package's `package.json` goes into every app Dockerfile's `deps` stage.

If a convention changes, update this file and the matching rule in the same change.
