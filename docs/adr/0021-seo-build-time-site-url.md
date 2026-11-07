# 0021. SEO for the public site: absolute URLs baked at build time, per-language metadata

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related:** 0016, 0019, 0020, `web/.claude/rules/seo.md`, `web/apps/portfolio-web/src/seo.ts`,
  `web/apps/portfolio-web/src/site.ts`

## Context

portfolio-web must rank and preview well in both languages. Search engines want absolute URLs
for the canonical, `hreflang` alternates, the sitemap and Open Graph images, and they must be in
the HTML `<head>`. The pages are prerendered at build time (Cache Components), while the public
origin (`APP_URL`) was only known at runtime ("one image for every environment"). Reading it at
runtime would make every page's metadata dynamic.

## Decision

- **`SITE_URL` is baked into the portfolio-web build** (`next.config.ts` `env`, Docker
  `--build-arg SITE_URL`, which the Dockerfile requires). It is the `metadataBase` and the origin
  of the sitemap, robots.txt, JSON-LD and link previews. One image per public domain (staging and
  prod are built separately anyway). Every other setting stays runtime env.
- Every public page exports complete metadata through `publicPageMetadata()`: title, description,
  canonical = its own language, `hreflang` for every language + `x-default` (the path without a
  locale, which redirects by language), Open Graph (type, locale + alternates, url, site name) and
  a large Twitter card. Private pages (sign-in, dashboard) are `noindex, nofollow`.
- `sitemap.xml`: every public page in every language with its hreflang alternates; `robots.txt`
  disallows only `/auth/` and `/files/` (Route Handlers), so crawlers can still read `noindex`.
- JSON-LD (schema.org): `WebSite` + `Person` on the home page, `ProfilePage` on About, one graph
  with stable `@id`s.
- Link previews: an Open Graph image per language rendered with `next/og` and Geist (with
  Vietnamese glyphs, fonts vendored in `packages/ui/assets/fonts`, SIL OFL), cached in memory
  per process and served with a 1-day `Cache-Control` (an image route that reads `params` is
  dynamic under Cache Components).
- Icons from one SVG per app (`src/app/icon.svg` + a maskable variant), rendered by
  `npm run icons` (sharp) into `favicon.ico` (16/32/48), `apple-icon.png` (180) and the manifest
  PNGs (192, 512, maskable 512); `manifest.webmanifest`; `theme-color` for light and dark.
- admin-web is never indexed: `robots.txt` disallows everything, plus `X-Robots-Tag` and robots
  metadata (ADR 0019).

## Consequences

- A portfolio-web image is tied to one domain: forgetting the build arg fails the build instead
  of shipping `localtest.me` canonicals. CI passes `--build-arg SITE_URL=https://www.<domain>`.
- Changing the domain needs a rebuild, not just a new env value.
- New public page: add it to `PUBLIC_PAGES` (`src/site.ts`) and export `publicPageMetadata()`.

## Alternatives considered

- **Runtime metadata (read `APP_URL` per request)**: same image everywhere, but every page's
  metadata becomes dynamic (streamed after the shell; blocking for HTML-only bots) for a value
  that never changes per deployment. Rejected.
- **Relative canonical / hreflang**: Google requires absolute hreflang URLs. Rejected.
- **An SEO library (next-seo…)**: Next.js's Metadata API covers everything here. Rejected.
