@AGENTS.md

# wine-web: Hãng rượu Khang Hưng Tửu (Long An)

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page; only the articles come from the API.** Facts come from the company's banner, brochure and
  showroom photos, hard-coded in `src/content/winery.ts` (phones, address, product names, the
  printed showroom price); every other visible word is in `src/i18n/messages/<lang>.json`.
  Product names are brand names: kept as printed in every language.
- **Alcohol rules (Vietnam, Law on Prevention and Control of Harmful Effects of Alcohol 2019):**
  keep `<LegalNotice />` (18+, pregnant women, don't drive) next to every call to buy and in the
  footer; no health or medicinal claims (no "bổ", "tráng dương", cures); no content aimed at
  minors. Advertising drinks of 15% ABV or more is restricted: have the owner confirm the site
  is allowed before it goes public.
- Never invent facts about the company (prices, ingredients, awards, reviews). Ingredient lists
  are not published until the owner confirms them (the brochure scan is unreadable in places).
- Languages: Vietnamese (default: a first visit always opens in Vietnamese, ADR 0038; cookie
  `wine_locale`) and English. Prices in VND (`src/lib/format.ts`).
- Look (from the brochure): lucky red `--brand`, imperial yellow `--yellow` (= the product
  photos' background `#ffe500`), gold `--gold` / `--gold-text`, dark maroon `--deep`.
  Fonts: Playfair Display (`font-display`), Be Vietnam Pro (`font-sans`). Logo: the red "興" seal
  (`src/components/logo.tsx`).
- Photos in `public/images/` are cropped from the company's printed materials and phone photos
  (low resolution: replace with originals; later they come from object storage via `STORAGE_ORIGINS`).
- **Articles** (`/bai-viet`, `/bai-viet/chu-de/<topic>`, `/bai-viet/<slug>`; `src/features/articles`):
  from content-service, site `wine`, written in the admin site, read like laundry-web's
  (`@web/core/content/site-articles`: this server's service account, Keycloak client `wine-web`,
  ADR 0032; cached minutes; API errors throw, never cached). Slugs and topic segments per language
  (another language's or an old slug redirects, 308). Topics `brand` / `craft` / `serving` /
  `guide` / `partners` (their keys pick the fallback cover, a winery photo; else the media library
  cover, `@web/ui/cover-image`, CDN in `STORAGE_ORIGINS`). Bodies: HTML sanitized by the API
  (ADR 0031/0033), styled by `.article-html` (`features/article-templates/article-html.css`) +
  `@web/ui/article-layout.css`. One sample article for writers, "[Mẫu] Hướng dẫn tạo bài viết…"
  (vi + en), seeded with `npm run seed:article-templates -- wine` in nest-microservice
  (`article-templates/wine.ts`, the guide shared with laundry and nails in `guide.ts`; it also
  creates the five topics); drawings `public/images/guide/*.svg` (laundry's, recoloured). Home shows
  the 3 newest before Contact, only when there are any (API down: no section, the menu's Articles
  opens `/bai-viet`). Same alcohol rules: no health claims, `<LegalNotice />` next to the call-to-buy
  box on every article.
- **Navigation**: `@web/ui/section-nav` + `<SmoothScroll />`, Trang chủ → Sản phẩm → Danh mục → Hợp tác
  → Về chúng tôi → Bài viết → Liên hệ (the sections' order). A `section[id]` stops right under the
  sticky header (fixed height `--header-h`, 68 px + 1 px border, `globals.css`, in `@layer base`);
  Home is the hero with `scroll-mt-[100vh]`. Sections `py-14 sm:py-16`.
- **Legal pages**: privacy policy `/chinh-sach-bao-mat`, terms `/dieu-khoan-su-dung` (same path in
  both languages, `LEGAL_PATHS` in `src/site.ts`, like laundry's), in the footer of every page. Text in
  `policies.*` of the dictionaries (`legal.*` is the 18+ notice), winery facts filled from `winery.ts`.
  The company has no website of its own to copy from (www.ruoukhanghung.com, printed on the banner,
  does not resolve, 2026-11-12): the text describes only what this site does (no accounts, forms or
  online shop; orders by phone/Zalo; 18+ only; one language cookie; the Google Maps embed). Change it,
  and `LEGAL_UPDATED`, with any new data collection. Not reviewed by a lawyer yet.
- SEO (`.claude/rules/seo.md`): every page's metadata through `pageMetadata` (`src/seo.ts`: canonical,
  hreflang + x-default, Open Graph + Twitter card), `metadataBase` = `SITE_URL`; JSON-LD `Winery` +
  `WebSite` on the home page, + `Article` on article pages; `app/sitemap.ts` (fixed pages + published
  articles), `app/robots.ts`. Link preview cards (`features/articles/og-card.tsx`; Geist has no CJK
  glyph, so the card shows "KH" instead of the 興 seal) from Route Handlers, not
  `opengraph-image.tsx` (a file-based image would override article covers): the site's
  `/og/<lang>.png` (`app/og/[image]/route.ts`), an article's `/og/bai-viet/<lang>/<slug>.png` when it
  has no media cover (`app/og/bai-viet/[lang]/[image]/route.ts`).
- **Article templates** (`/bai-viet/mau`, noindex, for the owner to pick): 10 layouts in
  `src/content/article-templates/` (HTML with grey placeholders and [bracketed] sample text),
  rendered through the layout vocabulary of ADR 0033 (`features/article-templates/article-html.ts`
  mirrors `ARTICLE_HTML_CLASSES` of libs/common; blocks styled by `@web/ui/article-layout.css`,
  text by `article-html.css`). Kept as a layout catalogue for the owner; the real sample article
  is the seeded guide (above).
- **Map**: the contact card ends with a keyless Google Maps embed (`mapEmbedSrc` in
  `src/content/winery.ts`; `https://www.google.com` is the only `frameOrigins` entry in `src/proxy.ts`)
  and its "Chỉ đường" button. It searches the winery's own Google listing under the post-2025-merger
  address ("109 QL1A, Mỹ Yên, Tây Ninh", 10.6347, 106.5210, checked 2026-11-12); the site still shows
  the banner's address (Long Hiệp, Bến Lức, Long An) until the owner confirms the new one.
- No order form yet: ordering is by phone/Zalo. A form = `/new-form`, never a client-side submit.
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route.

`npm run dev` (http://localhost:3300), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:wine`).
