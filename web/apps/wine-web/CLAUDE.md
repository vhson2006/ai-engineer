@AGENTS.md

# wine-web: Hãng rượu Khang Hưng Tửu (Long An)

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Built on `@web/site-kit` (ADRs 0042, 0045): the articles, legal
pages, SEO, sitemap, robots, proxy, header, footer and phones' action bar are the kit's; read
`packages/site-kit/README.md` before adding anything a business site could share.

Specific to this app:
- **Public landing page; only the articles come from the API.** Facts in `src/content/business.ts`
  (the kit's `Business`, and `winery`: every phone number, Zalo, the website, the banner's address
  lines), products in `src/content/products.ts`, from the company's banner, brochure and showroom
  photos; every other visible word in `src/i18n/messages/<lang>.json`. Product names are brand
  names: kept as printed in every language.
- **Alcohol rules (Vietnam, Law on Prevention and Control of Harmful Effects of Alcohol 2019):**
  keep `<LegalNotice />` (18+, pregnant women, don't drive; `notices.*`) next to every call to buy
  (hero, contact, the articles' call to action), in the drawer, the footer and the legal pages; no
  health or medicinal claims (no "bổ", "tráng dương", cures); no content aimed at minors.
  Advertising drinks of 15% ABV or more is restricted: have the owner confirm the site is allowed
  before it goes public.
- Never invent facts about the company (prices, ingredients, awards, reviews). Ingredient lists
  are not published until the owner confirms them (the brochure scan is unreadable in places).
- `src/website.ts`: Vietnamese first (ADR 0038; cookie `wine_locale`), English; the kit's article
  URLs; two legal pages (privacy, terms). No opening hours (orders by phone). Prices in VND.
- Look (from the brochure, `src/app/globals.css`): lucky red `--brand`, imperial yellow `--yellow`
  (= the product photos' background `#ffe500`, the kit's `--accent`), gold `--gold` / `--gold-text`,
  dark maroon `--deep`. Fonts: Playfair Display (`--font-heading`), Be Vietnam Pro (`--font-body`).
  Logo: the red "興" seal (`src/components/logo.tsx`). Article covers in the brochure's double frame
  (`.article-cover`), bodies styled by `.article-body` (◆ bullets, serif quotes).
- Photos in `public/images/` are cropped from the company's printed materials and phone photos
  (low resolution: replace with originals).
- **Articles**: the kit's pages (`site.routes.*`, `src/site.tsx`), from content-service, site `wine`
  (Keycloak client `wine-web`, ADR 0032), with a share bar (Facebook, copy link) and the winery's
  call to buy (`src/components/article-cta.tsx`). Topics `brand` / `craft` / `serving` / `guide` /
  `partners` pick the fallback cover. One sample article for writers, "[Mẫu] Hướng dẫn tạo bài viết…",
  a draft, is seeded with the site's other articles and its five topics by
  `npm run seed:content -- wine` in nest-microservice (ADR 0044).
- **Link previews**: the brand card (`src/og-card.tsx`, rendered by the kit; Geist has no CJK glyph,
  so it shows "KH" instead of the 興 seal) per language `/og/<lang>.png`, and per article without a
  media cover `/og/bai-viet/<lang>/<slug>.png` (the route files re-export `site.routes.ogImage` /
  `articleOgImage`; fonts traced in `next.config.ts`).
- **Navigation**: Trang chủ → Sản phẩm → Danh mục → Hợp tác → Về chúng tôi → Bài viết → Liên hệ (the
  sections' order, `src/app/[lang]/layout.tsx`). A `section[id]` stops right under the sticky header
  (`--header-h`, 68 px + 1 px border). Sections `py-14 sm:py-16`.
- **Legal pages** (the kit's routes) with the winery's own texts (`legal.*`; `{zalo}` filled in
  `src/site.tsx`; dated in `src/website.ts`). The company has no website of its own to copy from
  (www.ruoukhanghung.com, printed on the banner, does not resolve, 2026-11-12): the text describes
  only what this site does (no accounts, forms or online shop; orders by phone/Zalo; 18+ only; one
  language cookie; the Google Maps and YouTube embeds). Change it, and the date, with any new data
  collection. Not reviewed by a lawyer yet.
- **Map**: the contact card ends with a keyless Google Maps embed (zoom 15) and its "Chỉ đường"
  button. It searches the winery's own Google listing under the post-2025-merger address ("109 QL1A,
  Mỹ Yên, Tây Ninh", checked 2026-11-12); the site still shows the banner's address (Long Hiệp, Bến
  Lức, Long An) until the owner confirms the new one.
- No order form yet: ordering is by phone/Zalo. A form = `/new-form`, never a client-side submit.
- The article templates gallery (`/bai-viet/mau`) was removed (2026-11-14, ADR 0045): writers use
  the seeded guide article and the admin site's layout blocks.
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route.

`npm run dev` (http://localhost:3300), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:wine`).
