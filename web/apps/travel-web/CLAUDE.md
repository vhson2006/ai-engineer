@AGENTS.md

# travel-web: Gió Mùa Travel

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Built on `@web/site-kit` (ADR 0042): read its sources before adding
anything a business site could share.

Specific to this app:
- **A sample site: Gió Mùa Travel is FICTIONAL** (a small-group tour operator in Đà Nẵng). Name, address, phone (`0900 000 …`), email
  (`.example`), hours, prices and pictures are invented; the footer says so (`business.sample`).
  For a real client: replace `src/content/`, the dictionaries and the photos, set `sample: false`.
- Facts in `src/content/business.ts` (the kit's `Business`), catalogue data next to it; every
  visible word in `src/i18n/messages/<lang>.json` (the site's own; the kit brings common UI,
  articles, legal texts and 404, merged in `src/i18n/dictionaries.ts`). Never a key that the kit
  also has at the top level (`common`, `menu`, `contact`, `faq`, `articles`, `legal`, `notFound`;
  `footer` is merged).
- Landing page `src/app/[lang]/page.tsx`: Hero, tours (`src/content/tours.ts`), why us, how it works (includes / excludes), articles, FAQ, contact. The menu, drawer and footer
  links come from `src/content/nav.ts` (same order as the page).
- Look: Lexend + Be Vietnam Pro; ocean teal, sunset orange, sand; round cards (`src/app/globals.css` tokens, fonts in `src/app/[lang]/layout.tsx`, logo in
  `src/components/logo.tsx`, `src/app/icon.svg`).
- **Shared routes**: articles (`/bai-viet`, topics, an article), legal pages, 404, sitemap and
  robots are the kit's (`site.routes.*` from `src/site.ts`); the route files only re-export them.
  Articles come from content-service, site `travel`, with this server's service account (Keycloak
  client `travel-web`, ADR 0032). Topics: destinations, tips, guide (keys = fallback covers in `src/site.ts`),
  seeded with the writers' guide and the sample articles by
  `npm run seed:content -- travel` in nest-microservice (snapshot `apps/content-service/seed/content/travel/`, ADR 0044), which also creates the site. Keycloak: its client and service account in `k8s/sites/travel/keycloak`, applied on deploy (ADR 0043).
- Photos in `public/images/` (hero, ha-long, ha-giang, hoi-an, phu-quoc; `og-default.jpg` 1200×630 from the hero) were generated
  with Gemini (AI_GEMINI_IMAGE_MODEL of ai-service): no text, logos or identifiable people. The
  writers' guide drawings (`images/guide/`, `images/placeholder/`) are laundry's, recoloured.
- Languages: Vietnamese (default, ADR 0038) and English; cookie `travel_locale`. Prices in VND.
- No booking form: phone, Zalo and email. A form = `/new-form`, then extend the kit's legal texts.
- Deployment: `k8s/sites/travel` (ADR 0047: the shared template; image from `web/Dockerfile`); not run by any environment yet.

`npm run dev` (http://localhost:3600), `npm test`, `npm run typecheck`, `npm run lint`: from this
folder or from `web/` (`npm run dev:travel`).
