@AGENTS.md

# laundry-web: Giặt sấy SFaster

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page; only the articles come from the API.** Facts and prices come from the shop's sign artwork
  (68 Lê Hồng Phong, hotline/Zalo), opening hours (the owner, 2026-11-12: Mon–Fri 07:00–19:00,
  Sat–Sun 07:00–17:00, closed on public holidays) and price board, hard-coded in `src/content/shop.ts`; every visible word is in
  `src/i18n/messages/<lang>.json`. The services board also prints "Giặt sấy 10K/KG": the owner
  chose to keep the detailed price board (2026-11-11), so the site doesn't show 10K/kg.
- Article covers: the media library image the admins chose (ADR 0034, `@web/ui/cover-image`:
  `<img srcset>`, already optimized), else a shop photo by topic. The CDN must be in `STORAGE_ORIGINS`.
- Never invent facts about the shop (turnaround times, delivery, discounts beyond "giặt 7 lần
  tặng 1"). Questions the shop hasn't answered say "call or message us on Zalo".
- The price estimator (`src/features/estimate/`, `src/lib/pricing.ts` + tests) mirrors the
  price board exactly; change both with the board. It only computes in the browser (no
  Server Action, nothing is sent).
- Not on the site on purpose: the shop is also a Vietlott point of sale (unrelated brand); the 40 Cửu Long branch
  printed on the sign (closed, 2026-11-11); a services list and drop-off tips (removed 2026-11-11:
  the price board already names every service).
- Languages: Vietnamese (default: a first visit always opens in Vietnamese, ADR 0038; cookie
  `laundry_locale`) and English. Prices in VND (`src/lib/format.ts`).
- Look (from the sign): green `--brand`, yellow `--sun` (the `.sign-letters` lettering),
  red `--cherry` (small accents), dark green `--deep`. Fonts: Baloo 2 (`font-display`),
  Be Vietnam Pro (`font-sans`). Navigation: `@web/ui/section-nav` + `<SmoothScroll />`; a section
  stops right under the 66 px sticky header (`section[id]` scroll margin in `globals.css`, in
  `@layer base` so the hero's `scroll-mt-[100vh]` wins: Home = top of page). Sections: `py-14 sm:py-16`.
- Images in `public/images/`: `machines.jpg`, `shelves.jpg` are the owner's phone photos;
  `signboard.jpg` is the sign's print artwork (article templates); `cover-shop.jpg` is a 4:3 article
  cover built from it (sign on the brand green, so cards never crop its lettering). Text-only
  artwork (the opening-hours poster) is rebuilt in HTML, never shown as an image.
- Contact: opening-hours and phone/Zalo cards beside a square keyless Google Maps embed (the address:
  the map, the footer) (`mapEmbedSrc` in `src/content/shop.ts`; `https://www.google.com` is the only `frameOrigins` entry in `src/proxy.ts`).
- **Articles** (`/bai-viet`, topics `/bai-viet/chu-de/<segment>`, `src/features/articles/`): from
  content-service, site `laundry`, written in the admin site. `data.ts` reads them (through `@web/core/content/site-articles`, shared with nails-web) with this
  server's service account (Keycloak client `laundry-web`, `siteApiFetch`, ADR 0032), cached a few
  minutes (`'use cache'`); API errors throw (never cached). Slugs and topic segments are per
  language: a slug of another language or an old slug redirects (308). Bodies are HTML sanitized
  by the API (ADR 0031 + layout blocks, ADR 0033), text styled by `.article-body`, blocks by
  `@web/ui/article-layout.css` (shop colours via `--article-accent*`). Covers: see above. One sample article for writers,
  "[Mẫu] Hướng dẫn tạo bài viết…" / "[Template] How to build an article…" (vi + en: every layout
  block with when to use it and how to add it in the admin site), is seeded with
  `npm run seed:article-templates` in nest-microservice (content in
  `apps/content-service/scripts/article-templates/laundry.ts`, the guide shared with nails and wine in `guide.ts`); its drawings are
  `public/images/guide/*.svg`, grey placeholders `public/images/placeholder/*.svg`. The ten
  earlier templates and the uploaded test photos were deleted (2026-11-12).
- No booking/pickup form yet: by phone/Zalo. A form = `/new-form`, never a client-side submit.
- **Legal pages** (2026-11-12): privacy policy `/chinh-sach-bao-mat`, terms `/dieu-khoan-su-dung`, data
  deletion instructions `/xoa-du-lieu` (same path in both languages, `LEGAL_PATHS` in `src/site.ts`:
  social platforms register these URLs, keep them stable), linked in the footer of every page. Text in
  `legal.*` of the dictionaries, shop facts filled from `shop.ts`; it describes only what the site does
  (no accounts, no forms, one language cookie, the Google Maps embed): change it, and `LEGAL_UPDATED`,
  with any new data collection (a form, analytics, social sign-in). Not reviewed by a lawyer yet.
- **SEO** (`src/seo.ts`, `src/site.ts`): every page's metadata through `pageMetadata` (canonical,
  hreflang + x-default, Open Graph + Twitter card, default preview `public/images/og-default.jpg`
  1200×630, an article's cover otherwise), `metadataBase` from `SITE_URL` (baked at build, defaults to
  APP_URL), JSON-LD `LaundryOrDryCleaner` + `WebSite` on the home page, `/sitemap.xml` (fixed pages +
  published articles) and `/robots.txt`.
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route.

`npm run dev` (http://localhost:3400), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:laundry`).
