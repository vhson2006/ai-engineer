# web

The websites: Next.js 16 BFF apps and the packages they share (npm workspace, ADR 0019).

| Path | What |
|---|---|
| [`apps/portfolio-web/`](apps/portfolio-web/README.md) | The user site (www): pages, sign-in, dashboard, uploads |
| [`apps/admin-web/`](apps/admin-web/README.md) | The admin site (admin): administrators only, password + one-time code |
| `packages/core/` (`@web/core`) | BFF core: API client, sessions and OIDC (+ the `/auth/*` handlers), CSRF, CSP, rate limits, Server Action helpers, uploads, i18n |
| `packages/ui/` (`@web/ui`) | Design system: shadcn/ui-style components on Radix + Tailwind (`@web/ui/<name>`), forms (react-hook-form + zod), data tables (TanStack Table), design tokens |

Packages are TypeScript source (no build step); an app imports them like any package
(`import { apiFetch } from '@web/core/api'`, `import { Button } from '@web/ui/button'`).

Inside an app (ADR 0022):

```
src/app/[lang]/…        routes: thin pages (server), metadata
src/features/<feature>/ schema.ts (zod) · actions.ts (+ test) · *-table.tsx · *-dialog.tsx · toolbar.tsx · search-params.ts
src/components/         the app shell (header, footer)
src/i18n/               languages and dictionaries
```

Stack: Next.js 16 · React 19 · Tailwind v4 · Radix (`radix-ui`) · react-hook-form + zod ·
TanStack Table v9 · nuqs · sonner · lucide-react · cmdk · @daypicker/react + date-fns · recharts ·
motion · Tiptap · dnd-kit · write-excel-file. Every component, live: admin `/design-system`. Agents: [`CLAUDE.md`](CLAUDE.md).

## Run

Requires the stack (root README): `npm run k8s:up` and `npm run k8s:forward` at the repo root,
`npm run start:dev` in `nest-microservice/`.

```bash
cp apps/portfolio-web/.env.example apps/portfolio-web/.env.local   # once (same for admin-web)
npm install                     # once: the whole workspace
npm run dev                     # both apps: http://www.localtest.me:8000 and http://admin.localtest.me:8000
```

| Script (here) | |
|---|---|
| `npm run dev` | every app at once (portfolio-web :3000, admin-web :3100), logs prefixed by app; Ctrl+C stops all |
| `npm run dev:portfolio` / `npm run dev:admin` | one app only |
| `npm test` | Vitest in every workspace |
| `npm run check` | typecheck (`next typegen` + `tsc`), lint and tests of every workspace |
| `npm run build` | production build of every app |
| `npm run icons` | render every app's icon set (favicon.ico, apple-icon.png, manifest PNGs) from its `icon.svg` |

Production images (from the repo root):
`docker build -f web/apps/<app>/Dockerfile -t <app> web` (portfolio-web also needs
`--build-arg SITE_URL=https://www.<domain>`, ADR 0021). Each Dockerfile copies every workspace's
`package.json` in its `deps` stage: a new app or package is added to all of them.
