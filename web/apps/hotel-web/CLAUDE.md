@AGENTS.md

# hotel-web: Lantern House Hội An

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here). Built on `@web/site-kit` (ADR 0042): read its sources before adding
anything a business site could share.

Specific to this app:
- **A sample site: Lantern House Hội An is FICTIONAL** (an eighteen-room boutique hotel near Hội An old town). Name, address, phone (`0900 000 …`), email
  (`.example`), hours, prices and pictures are invented; the footer says so (`business.sample`).
  For a real client: replace `src/content/`, the dictionaries and the photos, set `sample: false`.
- Facts in `src/content/business.ts` (the kit's `Business`), catalogue data next to it; every
  visible word in `src/i18n/messages/<lang>.json` (the site's own; the kit brings common UI,
  articles, legal texts and 404, merged in `src/i18n/dictionaries.ts`). Never a key that the kit
  also has at the top level (`common`, `menu`, `contact`, `faq`, `articles`, `legal`, `notFound`;
  `footer` is merged).
- Landing page `src/app/[lang]/page.tsx`: Hero, rooms (`src/content/rooms.ts`), amenities, location (places nearby), check-in/out and policies, articles, FAQ, contact. The menu, drawer and footer
  links come from `src/content/nav.ts` (same order as the page).
- Look: Cormorant Garamond + Manrope; indigo night, lantern amber, cream (`src/app/globals.css` tokens, fonts in `src/app/[lang]/layout.tsx`, logo in
  `src/components/logo.tsx`, `src/app/icon.svg`).
- **Shared routes**: articles (`/bai-viet`, topics, an article), legal pages, 404, sitemap and
  robots are the kit's (`site.routes.*` from `src/site.ts`); the route files only re-export them.
  Articles come from content-service, site `hotel`, with this server's service account (Keycloak
  client `hotel-web`, ADR 0032). Topics: hoi-an, stay, guide (keys = fallback covers in `src/site.ts`),
  seeded with the writers' guide and the sample articles by
  `npm run seed:content -- hotel` in nest-microservice (snapshot `apps/content-service/seed/content/hotel/`, ADR 0044), which also creates the site. Keycloak: its client and service account in `k8s/sites/hotel/keycloak`, applied on deploy (ADR 0043).
- Photos in `public/images/` (hero, courtyard, room-garden, room-deluxe, room-suite, pool, old-town; `og-default.jpg` 1200×630 from the hero) were generated
  with Gemini (AI_GEMINI_IMAGE_MODEL of ai-service): no text, logos or identifiable people. The
  writers' guide drawings (`images/guide/`, `images/placeholder/`) are laundry's, recoloured.
- Languages: Vietnamese (default, ADR 0038) and English; cookie `hotel_locale`. Prices in VND.
- No booking form: phone, Zalo and email. A form = `/new-form`, then extend the kit's legal texts.
- Deployment: `k8s/sites/hotel` (ADR 0047: the shared template; image from `web/Dockerfile`); not run by any environment yet.

`npm run dev` (http://localhost:3900), `npm test`, `npm run typecheck`, `npm run lint`: from this
folder or from `web/` (`npm run dev:hotel`).
