@AGENTS.md

# nails-web: Envy Nails Spa of Wendell (Wendell, NC)

The redesign of the salon's current website (https://envynailsspaofwendell.com): a bento-grid
pastel look, a nail art gallery, specialties and a quick booking bar. Facts follow that website.
It shares nothing with the other apps but `packages/`.

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page, no API yet.** Facts and prices come from the salon's website (services
  page, hours, the one phone (919) 366-6435, social links, the "Booking notes" banner), hard-coded in `src/content/salon.ts` (ids, USD prices, hours, phones); every
  visible word is in `src/i18n/messages/<lang>.json`, keyed by those ids. When the API exists, the
  page fetches the same shapes on the server (`apiFetch`) and `salon.ts` goes away.
- Never invent facts about the salon (reviews, ratings, staff, promotions): it is a real business.
- Languages: English (default, `en-US`: 12-hour times, `$59+`) and Vietnamese. Prices and hours
  are formatted in `src/lib/format.ts`.
- Look (bento, `src/app/globals.css`): porcelain white, text `#263238`, content in 24px cards
  (`bento()` in `src/components/bento.ts`, `rounded-3xl`, equal gaps) filled with `bg-mint` /
  `bg-rose` / `bg-baby` / `bg-lilac` (`*-strong` for small accents). Each section sits on a
  full-width `<Band>` (`src/components/band.tsx`) alternating white and a lighter pastel wash
  (`bg-wash-*`, lighter than the card fills); white cards on a wash use `bg-surface`; pills in `pill.ts`; one font,
  Plus Jakarta Sans (bold, tight headlines). Geometric, no florals. Logo = the website's "ENVY /
  Nails Spa Of Wendell" wordmark (`public/images/logo-envy.png`, inverted in dark mode); the gold
  EN monogram (business card, redrawn in SVG) stays on the gift certificate.
- **Photos** (`public/images/gallery/`) are the website's gallery images. Most look like licensed
  stock photos: confirm the salon may reuse them (or replace them with its own work) before going
  live, and never caption them "our work".
- **Booking**: the salon books online on a third-party page (`salon.bookingUrl`, Mac Marketing)
  and by phone when: 3+ people, no suitable time online, a favorite nail tech, special requests.
  The booking dialog plans the visit, then sends to that page (summary copied) or to a call
  (forced when a favorite tech is named). Nothing is submitted by this app.
- **Blog** (`/blog`, topics `/blog/topic/<segment>`, `src/features/articles/`): sample JSON
  (`src/content/articles.json`) in the shape the content service will return (ADR 0026), written
  only from the salon's menu, FAQ and policy; swap `data.ts` to `apiFetch` when the API exists.
  Bodies are structured blocks, never raw HTML. Home shows the 3 newest above Visit.
- **Map**: the Visit section embeds Google Maps without an API key
  (`www.google.com/maps?q=<salon.mapQuery>&output=embed`); `src/proxy.ts` allows exactly that
  origin in `frameOrigins` (CSP `frame-src`).
- Page: hero bento (statement, live open/closed status on the salon's clock `salon.timeZone`,
  featured-looks slideshow, signature pedicure) → promise row → gallery (`features/gallery`:
  filters + detail modal: estimated time, price = base service + add-on from the menu, palette)
  → specialties ("Meet the artists", no staff names until the salon provides them) → menu cards
  (full price list in a modal) → FAQ (native `<details>`; rewritten from the website's FAQ, whose
  booking answer wrongly said there is no phone) → visit bento (contact, hours, gift, policy) + a fixed quick
  booking bar (`features/booking/quick-bar.tsx`).
- Gallery times are ESTIMATES (the printed menu has none) and say "about"; every gallery and
  specialty price is a reference to a menu line (`priceOf`), checked by `open-status.test.ts`.
- Photos in `public/images/` are cropped from the salon's printed materials (low resolution:
  replace with originals when available; later they come from object storage via `STORAGE_ORIGINS`).
- The booking dialog (`features/booking`, opened by any `<BookButton>`) helps choose service,
  day/time (from the opening hours, `slots.ts`) and an optional tech name; no staff list is shown
  (none is known). If the app ever books through our API: `/new-form` (Server Action, CSRF, rate
  limit, zod, `once()`), never a client-side submit.
- Link preview card: `app/[lang]/opengraph-image.tsx` (+ `twitter-image.tsx`), drawn by
  `src/features/og/og-card.tsx` (wordmark, hero headline, four gallery looks; Geist and the images
  traced in `next.config.ts`); `metadataBase` = `SITE_URL` (`src/site.ts`).
- Not deployed yet: no Dockerfile, k8s manifests, Gateway route or sitemap.

`npm run dev` (http://localhost:3200), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:nails`).
