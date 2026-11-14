@AGENTS.md

# laundry-web: Giặt sấy SFaster

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Built on `@web/site-kit` (ADRs 0042, 0045): the articles, legal
pages, SEO, sitemap, robots, proxy, header, footer and phones' action bar are the kit's; read
`packages/site-kit/README.md` before adding anything a business site could share.

Specific to this app:
- **Public landing page; only the articles come from the API.** Facts in `src/content/business.ts`
  (the kit's `Business`: the shop's sign artwork, 68 Lê Hồng Phong, hotline/Zalo; opening hours from
  the owner, 2026-11-12: Mon–Fri 07:00–19:00, Sat–Sun 07:00–17:00, closed on public holidays), the
  price board in `src/content/prices.ts`; every visible word in `src/i18n/messages/<lang>.json` (the
  site's own; the kit's merged in `src/i18n/dictionaries.ts`). The services board also prints
  "Giặt sấy 10K/KG": the owner chose to keep the detailed price board (2026-11-11), so the site
  doesn't show 10K/kg.
- Never invent facts about the shop (turnaround times, delivery, discounts beyond "giặt 7 lần
  tặng 1"). Questions the shop hasn't answered say "call or message us on Zalo".
- The price estimator (`src/features/estimate/`, `src/lib/pricing.ts` + tests) mirrors the
  price board exactly; change both with the board. It only computes in the browser (no
  Server Action, nothing is sent).
- Not on the site on purpose: the shop is also a Vietlott point of sale (unrelated brand); the 40 Cửu Long branch
  printed on the sign (closed, 2026-11-11); a services list and drop-off tips (removed 2026-11-11:
  the price board already names every service).
- `src/website.ts`: Vietnamese first (ADR 0038; cookie `laundry_locale`), English; the kit's URLs
  (`/bai-viet`, `/bai-viet/chu-de/<topic>`, the three legal pages). Prices in VND (`formatVnd`).
- Look (from the sign, `src/app/globals.css`): green `--brand`, yellow `--sun` (the `.sign-letters`
  lettering, the kit's `--accent`), red `--cherry` (small accents), dark green `--deep`. Fonts:
  Baloo 2 (`--font-heading`), Be Vietnam Pro (`--font-body`). The footer and the articles' call to
  action carry the soap bubbles (`.bubbles`, `.article-cta`). A `section[id]` stops right under the
  66 px sticky header (`globals.css`, `@layer base`: the hero's `scroll-mt-[100vh]` wins). Sections:
  `py-14 sm:py-16`. The landing page's sections are this site's own (`src/app/[lang]/page.tsx`,
  `src/components/section-heading.tsx`).
- Images in `public/images/`: `machines.jpg`, `shelves.jpg` are the owner's phone photos;
  `signboard.jpg` is the sign's print artwork; `cover-shop.jpg` is a 4:3 article cover built from it
  (sign on the brand green, so cards never crop its lettering). Text-only artwork (the opening-hours
  poster) is rebuilt in HTML, never shown as an image.
- Contact: opening-hours and phone/Zalo cards beside a square keyless Google Maps embed
  (the kit's `mapEmbedSrc`, zoom 17).
- **Articles**: the kit's pages (`site.routes.*`, `src/site.ts`), from content-service, site `laundry`
  (Keycloak client `laundry-web`, ADR 0032). Topics `tips` / `services` / `shop` pick the fallback cover
  (`covers` in `src/site.ts`); else the media library cover. Bodies styled by `.article-body`
  (`globals.css`: display-font headings, sun-bordered quotes, bullets as small cards). One sample
  article for writers, "[Mẫu] Hướng dẫn tạo bài viết…", a draft, is seeded with the site's other
  articles by `npm run seed:content -- laundry` in nest-microservice (ADR 0044); its drawings are
  `public/images/guide/*.svg`, grey placeholders `public/images/placeholder/*.svg`.
- No booking/pickup form yet: by phone/Zalo. A form = `/new-form`, never a client-side submit.
- **Legal pages** (privacy policy, terms, data deletion instructions: the kit's routes) with the
  shop's own texts (`legal.*` in the dictionaries; dated by `legalUpdated` in `src/website.ts`). They
  describe only what the site does (no accounts, no forms, one language cookie, the Google Maps and
  YouTube embeds): change them, and the date, with any new data collection. Not reviewed by a lawyer yet.
- SEO is the kit's (`.claude/rules/seo.md`): JSON-LD `LaundryOrDryCleaner` + `WebSite`, + `Article`
  on an article; default preview `public/images/og-default.jpg`.
- Deployment: `k8s/sites/laundry` (ADR 0047: the shared template; image from `web/Dockerfile`), run by local staging (`https://laundry.staging.localtest.me`); not in prod yet.

`npm run dev` (http://localhost:3400), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:laundry`).
