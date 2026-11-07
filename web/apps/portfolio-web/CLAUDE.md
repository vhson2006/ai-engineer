@AGENTS.md

# portfolio-web: the user site

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Architecture, auth flow, files and security: `README.md`.

Specific to this app:
- Languages: English (reference) and Vietnamese. Pages are under `src/app/[lang]/` (`/en`, `/vi`,
  `/<lang>/about`, `/login`, `/dashboard`); Route Handlers `/auth/*`, `/files/[id]/download` are not
  localized. All text, including the personal content, is in `src/i18n/messages/<lang>.json`;
  `src/content/profile.ts` holds only what doesn't depend on the language (name, contacts).
- Keycloak client `web` (`KEYCLOAK_CLIENT_ID`), cookies `pw_session` / `pw_auth_txn`, Redis keys `web:*`
  (ACL user `web`).
- Its own look: override design tokens in `src/app/globals.css` (shared ones: `@web/ui/theme.css`).
- Server Actions here call `@web/core`; anything another app would need goes to `packages/`, not here.

`npm run dev` (http://www.localtest.me:8000), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/`.
