@AGENTS.md

# portfolio-web: the user site

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Architecture, auth flow, files and security: `README.md`.

Specific to this app:
- Languages: English (reference) and Vietnamese. Pages are under `src/app/[lang]/` (`/en`, `/vi`,
  `/<lang>/about`, `/<lang>/projects/<slug>`, `/login`, `/dashboard`); Route Handlers `/auth/*`, `/files/[id]/download`, `/demo/<id>` are not
  localized. All text, including the personal content, is in `src/i18n/messages/<lang>.json`;
  `src/content/profile.ts` holds only what doesn't depend on the language (name, contacts).
- Keycloak client `web` (`KEYCLOAK_CLIENT_ID`), cookies `pw_session` / `pw_auth_txn`, Redis keys `web:*`
  (ACL user `web`).
- Its own look: override design tokens in `src/app/globals.css` (shared ones: `@web/ui/theme.css`).
- The site of Văn Hải Sơn (from his CV), editorial look (Fraunces display serif + Geist, warm paper
  tokens in `src/app/globals.css`). Navigation rule: every menu item is a page. Freelancer = home
  (hero + interactive architecture diagram, the sample sites, how we work together); Resume = `/about` (bio, the platform behind this site, experience, skills, education).
  Contact is the footer block on every page (`#contact`, the header button). Don't add home
  sections that the menu can't reach. `/projects/[slug]`: case studies of the sample sites
  `web/apps/<id>-web` in two groups: built from real businesses (nails, laundry, wine) and industry
  templates (sushi, travel, flowers, autoparts, hotel, spa: fictional, say so). Project data and
  screenshots in `src/content/projects.ts` (the sitemap reads it too); words under `projects` in the
  dictionaries. Live demo: `/demo/<id>` (`app/demo/[slug]/route.ts`) redirects to `<ID>_URL`, read at
  request time (Kubernetes: `urls.env` via ConfigMap `public-urls`; dev: `.env.local`): no address
  in this app. Screenshots in `public/projects/` are taken from production builds of the sites
  (1440×900 @1x and 390×844 @2x with mobile emulation, through Chrome's DevTools Protocol): retake
  them when a site changes. Never present the
  samples as paid client work.
- Server Actions here call `@web/core`; anything another app would need goes to `packages/`, not here.

`npm run dev` (http://www.localtest.me:8000), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/`.
