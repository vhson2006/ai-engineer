@AGENTS.md

# nails-web: Envy Nail Spa (Wendell, NC)

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page, no API yet.** Facts and prices come from the salon's printed menu and
  business card, hard-coded in `src/content/salon.ts` (ids, USD prices, hours, phones); every
  visible word is in `src/i18n/messages/<lang>.json`, keyed by those ids. When the API exists, the
  page fetches the same shapes on the server (`apiFetch`) and `salon.ts` goes away.
- Never invent facts about the salon (reviews, ratings, staff, promotions): it is a real business.
- Languages: English (default, `en-US`: 12-hour times, `$59+`) and Vietnamese. Prices and hours
  are formatted in `src/lib/format.ts`.
- Look (from the printed menu): forest green `--brand`, gold `--gold` (monogram, ornaments; not
  body text on white), pastel sage `--sage` / `--surface-2`, dark leaf sections `--deep`. Fonts:
  Cormorant Garamond (`font-display`), Great Vibes (`font-script`), Be Vietnam Pro (`font-sans`).
  The EN monogram is redrawn in SVG (`src/components/logo.tsx`).
- Photos in `public/images/` are cropped from the salon's printed materials (low resolution:
  replace with originals when available; later they come from object storage via `STORAGE_ORIGINS`).
- No booking form yet: booking is by phone. A form = `/new-form` (Server Action, CSRF, rate
  limit, zod, `once()`), never a client-side submit.
- Not deployed yet: no Dockerfile, k8s manifests, Gateway route, sitemap or Open Graph image.

`npm run dev` (http://localhost:3200), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:nails`).
