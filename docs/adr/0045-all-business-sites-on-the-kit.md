# 0045. Every business site is built on the site kit

- **Status:** Accepted, implemented (dev)
- **Date:** 2026-11-14
- **Related:** 0042 (the kit; its "not migrated" point is replaced by this ADR), 0021 (SEO), 0038
  (default language), `web/packages/site-kit/` (README), `web/apps/{nails,wine,laundry}-web/`,
  `web/scripts/check-sites.mjs`

## Context

ADR 0042 built `@web/site-kit` for six sample sites and left nails, wine and laundry as they were:
about 9,600 lines between them, each with its own copy of the articles pages, legal pages, SEO,
JSON-LD, sitemap, proxy, languages, header and footer. Two families of sites, written two ways,
drifting apart. The three differ from the samples in ways the kit did not allow: nails is a salon
in the United States (English first, en-US formats, USD, New York's clock, no Zalo, `/blog` and
`/privacy-policy` URLs registered with its SMS program, two legal pages with their own effective
dates); wine has two legal pages, several phone numbers, no opening hours, alcohol notices next to
every call to buy, a share bar and per-article preview cards; all three have their own legal texts.

## Decision

- **One kit, configured per site** (not one kit per language: the sites differ in data, not in
  logic). `defineWebsite(business, options)` (`src/website.ts` of each site, client-safe): the
  languages and their order, the default language, Intl locales, time zone, currency, the
  articles' and legal pages' URLs, which legal pages exist, their dates. The kit's components and
  routes take this `website`; module-level constants (`DEFAULT_LOCALE`, `articlePaths`,
  `LEGAL_PATHS`) are gone.
- **`Business` covers a business anywhere**: optional Zalo and email, postal code and country,
  the business's own Maps link, socials, a legal name, a shorter name for titles, a JSON-LD logo
  and extra properties.
- **Slots instead of copies** for what is the site's own: the call to action under an article,
  what follows a legal text, the footer's contact column and note, a drawer note, the top bar; a
  site with its own header and footer (nails) builds them from the kit's parts (`SkipLink`,
  `LegalLinks`, `website.localeOptions`). Visual differences go through tokens and class hooks
  (`.article-cover`, `.article-cta`, `.article-masthead`, `.topic-chip`).
- **What was in one site and is useful to all moved into the kit**: the share bar, the Article
  JSON-LD on article pages, preview cards rendered by the kit and drawn by the site
  (`@web/site-kit/og`, `site.routes.ogImage` / `articleOgImage`).
- **A site's dictionary is merged one level deep** on top of the kit's: a site rewords a kit
  string or gives its own legal texts without repeating the rest.
- **The URLs, metadata and sitemaps of the three sites do not change** (checked page by page
  against the running sites before and after). Their landing pages stay theirs.
- wine's article templates gallery (`/bai-viet/mau`) is removed: writers have the seeded guide
  article and the admin site's blocks.
- **`npm run check:sites`** (in `npm run check`, so CI): every app depending on the kit has the
  standard files and no copy of the kit's (`src/seo.ts`, `src/i18n/locales.ts`,
  `src/features/articles`, imports of `@web/core/content/site-articles`…).

## Consequences

- One way to build a business site: a fix to SEO, legal pages, articles or languages reaches all
  nine. The three sites went from about 9,600 lines to about 5,000, most of it their landing pages
  (and nails' booking).
- The kit's pages look the same structure on every site; the three sites' article pages now
  follow it (themed: colours, fonts, frames), with small visible changes (nails' featured article
  on the ink band, the breadcrumb's "Home").
- Adding a third language means one entry in the kit's `LOCALES` and its dictionary, then each
  site's dictionary and `locales` option.

## Alternatives considered

- **A kit per language (Vietnamese, English):** the shared code is the same in every language;
  two kits would mean every fix twice. Rejected.
- **Keep the three sites apart:** no work now, two families forever. Rejected.
- **One multi-tenant app:** see ADR 0042.
