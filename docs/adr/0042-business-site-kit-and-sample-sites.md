# 0042. A shared kit for business sites, and six sample sites

- **Status:** Accepted, implemented (dev); its "not migrated" point replaced by 0045 (every site on the kit)
- **Date:** 2026-11-13
- **Related:** 0019 (web workspace), 0020 (i18n), 0021 (SEO), 0026/0028 (sites, site groups),
  0032 (service accounts), 0033/0040 (article blocks, YouTube), 0034 (media library), 0038 (default
  language), `web/packages/site-kit/`, `web/apps/{sushi,travel,flowers,autoparts,hotel,spa}-web/`

## Context

Nails, wine and laundry are sites for real businesses. Each one carries its own copy of the same
machinery: the articles pages (list, topic, article, redirects of old and other-language slugs),
legal pages, SEO metadata and JSON-LD, sitemap, robots, the proxy, header, footer, contact block.
We wanted six more sites (a sushi restaurant, a travel agency, a flower shop, a car-parts store, a
hotel, a spa) managed from the admin site like the first three. Copying that machinery six more
times breaks the web rule "shared code lives in packages/, never copied between apps".

## Decision

- **`@web/site-kit`** (`web/packages/site-kit/`): what every business site shares.
  - `createSite({ business, siteUrl, loadMessages, defaultImage, schemaImages, covers })` binds the
    kit to one site: locale and dictionary from the `[lang]` root segment, `pageMetadata`,
    `layoutMetadata`, JSON-LD (`structuredData`, the schema.org type from the business), the
    site's articles from content-service (ADR 0032) and ready-made routes: articles index, topic,
    article, the three legal pages, 404, sitemap, robots. A site's route files only re-export them.
  - Components: `SiteShell` (skip link, sticky header with scrollspy, footer, phones' action bar,
    smooth scroll), `SectionHeading`, `LatestArticles`, `Faq`, `ContactSection` (keyless Google Maps).
  - The kit's own strings (common UI, articles, legal texts, 404) in `src/messages/{vi,en}.json`,
    merged with the site's dictionary (`mergeMessages`); the legal texts take the business's facts
    as placeholders and describe what these sites do (no accounts, no forms, one cookie, Maps and
    YouTube embeds).
  - `theme.css`: tokens on top of `@web/ui/theme.css` (`--brand-strong`, `--accent`, `--deep`,
    card and button radius, heading case/weight), so each site looks like itself with the same
    components.
- **A site keeps** its business facts (`src/content/business.ts`), its catalogue (menu, tours,
  rooms…), its theme and fonts, logo, landing page and dictionaries. Vietnamese and English,
  Vietnamese first (ADR 0038), one language cookie per site.
- **Admin side**: each site is a content-service site (`POST /api/content/sites`, created by the
  seed when missing), Keycloak group `/sites/<id>`, confidential client `<id>-web` with a service
  account in that group with `content:read` (groups in the shared realm; the clients in
  `k8s/sites/<id>/keycloak`, used by dev now and by an environment once a site is deployed
  there). Articles, topics, media library, AI images and studio work in the admin site as for the
  first three. The Job keycloak-config applies them on the next deploy (ADR 0043); `npm run seed:content -- <id>` (ADR 0044) creates the site, its topics, the
  writers' guide and the sample articles with their images.
- **The six sites are samples**: fictional businesses (names, addresses, `0900 000 x0x` numbers,
  `.example` emails, prices). The footer says so (`business.sample`). Their photos were made with
  Gemini (the model of ai-service, ADR 0037), with the same guardrails: no text, logos or
  identifiable people; their prompts are in `web/scripts/sample-site-photos.mjs`, which remakes a
  missing photo. Ports 3500–4000; not deployed.
- **Nails, wine and laundry are not migrated** in this change (done since: ADR 0045).

## Consequences

- A new business site is a few hundred lines of its own (facts, landing page, words) instead of a
  copy of every shared page. A fix in the kit (SEO, legal text, articles) reaches every kit site.
- The kit's legal texts are generic: a site that collects data (a form, analytics, social sign-in)
  must extend them and move `LEGAL_UPDATED`.
- Two families of sites until the first three move onto the kit (ADR 0045, 2026-11-14).

## Alternatives considered

- **Copy laundry-web six times:** fastest to start, six times the fixes afterwards. Rejected.
- **One app, many sites (multi-tenant Next.js by host):** one build for all, but every site would
  share fonts, layout code and release cycle, and a mistake would affect all of them at once. The
  kit keeps one app per business, as the first three.
