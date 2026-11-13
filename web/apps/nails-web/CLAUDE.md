@AGENTS.md

# nails-web: Envy Nails Spa of Wendell (Wendell, NC)

The redesign of the salon's current website (https://envynailsspaofwendell.com): a bento-grid
pastel look, a nail art gallery, specialties and a quick booking bar. Facts follow that website.
It shares nothing with the other apps but `packages/`.

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page; only the blog comes from the API.** Facts and prices come from the salon's website (services
  page, hours, the one phone (919) 366-6435, social links, the "Booking notes" banner), hard-coded in `src/content/salon.ts` (ids, USD prices, hours, phones); every
  visible word is in `src/i18n/messages/<lang>.json`, keyed by those ids. When the API exists, the
  page fetches the same shapes on the server (`apiFetch`) and `salon.ts` goes away.
- Never invent facts about the salon (reviews, ratings, staff, promotions): it is a real business.
- Languages: English (default, `en-US`: 12-hour times, `$59+`; a first visit always opens in English,
  even on a Vietnamese browser, ADR 0038; cookie `nails_locale`) and Vietnamese. Prices and hours
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
- **Blog** (`/blog`, topics `/blog/topic/<segment>`, `src/features/articles/`): from content-service,
  site `nails`, written in the admin site, read like laundry-web's (`@web/core/content/site-articles`:
  this server's service account, Keycloak client `nails-web`, ADR 0032; cached minutes; API errors
  throw, never cached). Slugs and topic segments per language (another language's or an old slug
  redirects, 308). Topics `care` / `services` / `salon` (their keys pick the pastel and the fallback
  cover: a gallery look; else the media library cover, `@web/ui/cover-image`, CDN in `STORAGE_ORIGINS`).
  Bodies: HTML sanitized by the API (ADR 0031/0033), styled by `.article-body` + `@web/ui/article-layout.css`.
  One sample article for writers, "[Template] How to build an article…" (en + vi), seeded with
  `npm run seed:article-templates -- nails` in nest-microservice (`article-templates/nails.ts`,
  the guide shared with laundry and wine in `guide.ts`; it also creates the three topics); drawings
  `public/images/guide/*.svg` (laundry's, recoloured), placeholders `public/images/placeholder/`.
  Home shows the 3 newest in a band above Visit, only when there are any (API down: no band, and
  the menu's Blog opens `/blog`).
- **Map**: the Visit section embeds Google Maps without an API key
  (`www.google.com/maps?q=<salon.mapQuery>&output=embed`); `src/proxy.ts` allows exactly that
  origin in `frameOrigins` (CSP `frame-src`), plus `https://www.youtube-nocookie.com` and
  `imageOrigins` `https://i.ytimg.com` for YouTube embeds in articles (ADR 0040).
- **Navigation**: `@web/ui/section-nav` + `<SmoothScroll />`, Home → Gallery → Artists → Menu → FAQ →
  Blog → Visit (the bands' order). Each `<Band id>` carries the anchor and stops right under the
  sticky header (fixed height `--header-h`, 68 px, `globals.css`); Home is the hero band with
  `scroll-mt-[100vh]` (= top of page). Bands `py-14 sm:py-16`.
- **Legal pages**: `/privacy-policy`, `/terms-of-service` (the salon website's paths, `LEGAL_PATHS` in
  `src/site.ts`: its SMS program links to them, keep them stable), in the footer of every page. Text =
  the salon's own documents (envynailsspaofwendell.com, effective 2023-05-19 / 2026-01-01,
  `LEGAL_EFFECTIVE`), its "mobile app / ABC Salon System" wording adapted to this website, plus one line
  on Google Maps, YouTube and the booking page; Vietnamese is a translation (says English prevails). Not
  reviewed by a lawyer; when the salon changes its documents, change both dictionaries and the dates.
- **SEO** (`src/seo.ts`, `src/site.ts`): every page's metadata through `pageMetadata` (canonical,
  hreflang + x-default, Open Graph + Twitter card; the preview card `/og/<lang>.png` from
  `app/og/[image]/route.ts`, an article's media cover otherwise), `metadataBase` = `SITE_URL`, JSON-LD
  `NailSalon` (+ `ReserveAction` to the booking page) + `WebSite` on the home page, `/sitemap.xml`
  (fixed pages + published articles), `/robots.txt`.
- Page: hero bento (statement, live open/closed status on the salon's clock `salon.timeZone`,
  featured-looks slideshow, signature pedicure) → promise row → gallery (`features/gallery`:
  filters + detail modal: estimated time, price = base service + add-on from the menu, palette)
  → specialties ("Meet the artists", no staff names until the salon provides them) → menu cards
  (full price list in a modal) → FAQ (native `<details>`; rewritten from the website's FAQ, whose
  booking answer wrongly said there is no phone) → latest articles → visit bento (contact, hours, gift, policy) + a fixed quick
  booking bar (`features/booking/quick-bar.tsx`).
- Gallery times are ESTIMATES (the printed menu has none) and say "about"; every gallery and
  specialty price is a reference to a menu line (`priceOf`), checked by `open-status.test.ts`.
- Photos in `public/images/` are cropped from the salon's printed materials (low resolution:
  replace with originals when available; later they come from object storage via `STORAGE_ORIGINS`).
- The booking dialog (`features/booking`, opened by any `<BookButton>`) helps choose service,
  day/time (from the opening hours, `slots.ts`) and an optional tech name; no staff list is shown
  (none is known). If the app ever books through our API: `/new-form` (Server Action, CSRF, rate
  limit, zod, `once()`), never a client-side submit.
- Link preview card: `app/og/[image]/route.ts` (not `opengraph-image.tsx`: a file-based image would
  override article covers), drawn by `src/features/og/og-card.tsx` (wordmark, hero headline, four
  gallery looks; Geist and the images traced in `next.config.ts`).
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route (the `nails-web` Keycloak client is
  in the dev realm only).

`npm run dev` (http://localhost:3200), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:nails`).
