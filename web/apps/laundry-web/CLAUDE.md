@AGENTS.md

# laundry-web: Giặt sấy SFaster

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page; only the articles come from the API.** Facts and prices come from the shop's sign artwork
  (two branches: 40 Cửu Long and 68 Lê Hồng Phong, hotline/Zalo), opening-hours poster
  (07:00–20:00) and price board, hard-coded in `src/content/shop.ts`; every visible word is in
  `src/i18n/messages/<lang>.json`. The services board also prints "Giặt sấy 10K/KG": the owner
  chose to keep the detailed price board (2026-11-11), so the site doesn't show 10K/kg.
- Never invent facts about the shop (turnaround times, delivery, discounts beyond "giặt 7 lần
  tặng 1"). Questions the shop hasn't answered say "call or message us on Zalo".
- The price estimator (`src/features/estimate/`, `src/lib/pricing.ts` + tests) mirrors the
  price board exactly; change both with the board. It only computes in the browser (no
  Server Action, nothing is sent).
- Not on the site on purpose: the shop is also a Vietlott point of sale (unrelated brand).
- Languages: Vietnamese (default) and English. Prices in VND (`src/lib/format.ts`).
- Look (from the sign): green `--brand`, yellow `--sun` (the `.sign-letters` lettering),
  red `--cherry` (small accents), dark green `--deep`. Fonts: Baloo 2 (`font-display`),
  Be Vietnam Pro (`font-sans`). Navigation: `@web/ui/section-nav` + `<SmoothScroll />`.
- Images in `public/images/`: `machines.jpg`, `shelves.jpg` are the owner's phone photos;
  `signboard.jpg` is the sign's print artwork (contact section); `cover-shop.jpg` is a 4:3 article
  cover built from it (sign on the brand green, so cards never crop its lettering). Text-only
  artwork (the opening-hours poster) is rebuilt in HTML (`HoursPoster`), never shown as an image.
- **Articles** (`/bai-viet`, topics `/bai-viet/chu-de/<segment>`, `src/features/articles/`): from
  content-service, site `laundry`, written in the admin site. `data.ts` reads them with this
  server's service account (Keycloak client `laundry-web`, `siteApiFetch`, ADR 0032), cached a few
  minutes (`'use cache'`); API errors throw (never cached). Slugs and topic segments are per
  language: a slug of another language or an old slug redirects (308). Bodies are HTML sanitized
  by the API (ADR 0031 + layout blocks, ADR 0033), text styled by `.article-body`, blocks by
  `@web/ui/article-layout.css` (shop colours via `--article-accent*`). Covers: a shop photo per
  topic until uploads. Ten article templates ("[Mẫu N]" / "[Template N]", vi + en) are seeded with
  `npm run seed:article-templates` in nest-microservice (content in
  `apps/content-service/scripts/article-templates/laundry.ts`); their grey images are
  `public/images/placeholder/*.svg`.
- No booking/pickup form yet: by phone/Zalo. A form = `/new-form`, never a client-side submit.
- Not deployed yet: no Dockerfile, k8s manifests, Gateway route, sitemap or Open Graph image.

`npm run dev` (http://localhost:3400), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:laundry`).
