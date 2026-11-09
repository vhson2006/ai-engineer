@AGENTS.md

# wine-web: Hãng rượu Khang Hưng Tửu (Long An)

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page, no API yet.** Facts come from the company's banner, brochure and
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
- Languages: Vietnamese (default) and English. Prices in VND (`src/lib/format.ts`).
- Look (from the brochure): lucky red `--brand`, imperial yellow `--yellow` (= the product
  photos' background `#ffe500`), gold `--gold` / `--gold-text`, dark maroon `--deep`.
  Fonts: Playfair Display (`font-display`), Be Vietnam Pro (`font-sans`). Logo: the red "興" seal
  (`src/components/logo.tsx`).
- Photos in `public/images/` are cropped from the company's printed materials and phone photos
  (low resolution: replace with originals; later they come from object storage via `STORAGE_ORIGINS`).
- No order form yet: ordering is by phone/Zalo. A form = `/new-form`, never a client-side submit.
- Not deployed yet: no Dockerfile, k8s manifests, Gateway route, sitemap or Open Graph image.

`npm run dev` (http://localhost:3300), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:wine`).
