@AGENTS.md

# flowers-web: Bông Florist

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Built on `@web/site-kit` (ADR 0042): read its sources before adding
anything a business site could share.

Specific to this app:
- **A sample site: Bông Florist is FICTIONAL** (a flower shop in District 3, Saigon). Name, address, phone (`0900 000 …`), email
  (`.example`), hours, prices and pictures are invented; the footer says so (`business.sample`).
  For a real client: replace `src/content/`, the dictionaries and the photos, set `sample: false`.
- Facts in `src/content/business.ts` (the kit's `Business`), catalogue data next to it; every
  visible word in `src/i18n/messages/<lang>.json` (the site's own; the kit brings common UI,
  articles, legal texts and 404, merged in `src/i18n/dictionaries.ts`). Never a key that the kit
  also has at the top level (`common`, `menu`, `contact`, `faq`, `articles`, `legal`, `notFound`;
  `footer` is merged).
- Landing page `src/app/[lang]/page.tsx`: Hero, bouquets in three sizes and delivery fees (`src/content/shop.ts`), occasions, delivery, flower care, articles, FAQ, contact. The menu, drawer and footer
  links come from `src/content/nav.ts` (same order as the page).
- Look: Playfair Display (italic accents) + Nunito; rose, sage, cream, plum (`src/app/globals.css` tokens, fonts in `src/app/[lang]/layout.tsx`, logo in
  `src/components/logo.tsx`, `src/app/icon.svg`).
- **Shared routes**: articles (`/bai-viet`, topics, an article), legal pages, 404, sitemap and
  robots are the kit's (`site.routes.*` from `src/site.ts`); the route files only re-export them.
  Articles come from content-service, site `flowers`, with this server's service account (Keycloak
  client `flowers-web`, ADR 0032). Topics: care, occasions, guide (keys = fallback covers in `src/site.ts`),
  seeded with the writers' guide and the sample articles by
  `npm run seed:content -- flowers` in nest-microservice (snapshot `apps/content-service/seed/content/flowers/`, ADR 0044), which also creates the site. Keycloak: its client and service account in `k8s/components/keycloak-sites/sites.json`, applied on deploy (ADR 0043).
- Photos in `public/images/` (hero, workshop, bouquet-blush, bouquet-garden, bouquet-sunny, care; `og-default.jpg` 1200×630 from the hero) were generated
  with Gemini (AI_GEMINI_IMAGE_MODEL of ai-service): no text, logos or identifiable people. The
  writers' guide drawings (`images/guide/`, `images/placeholder/`) are laundry's, recoloured.
- Languages: Vietnamese (default, ADR 0038) and English; cookie `flowers_locale`. Prices in VND.
- No booking form: phone, Zalo and email. A form = `/new-form`, then extend the kit's legal texts.
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route.

`npm run dev` (http://localhost:3700), `npm test`, `npm run typecheck`, `npm run lint`: from this
folder or from `web/` (`npm run dev:flowers`).
