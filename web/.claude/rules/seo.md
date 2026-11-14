---
paths:
  - 'apps/*/src/app/**'
  - 'apps/*/src/seo.ts'
  - 'apps/*/src/site.ts'
  - 'apps/*/src/site.tsx'
  - 'apps/*/src/website.ts'
  - 'packages/site-kit/src/**'
  - 'apps/*/assets/**'
  - 'apps/*/public/**'
  - 'apps/*/next.config.ts'
  - 'Dockerfile'
  - 'packages/core/src/i18n/seo.ts'
  - 'scripts/generate-icons.mjs'
---

# SEO, link previews, icons

Decision: ADR 0021. portfolio-web is public and optimized for search; admin-web is never indexed.

- **Public page = complete metadata**: `generateMetadata()` returns `publicPageMetadata({ t, locale,
  path, title, description })` (`src/seo.ts`): canonical, hreflang (+ x-default), Open Graph,
  Twitter card. Never a bare `{ title }` on a public page (a page's `openGraph` replaces the
  layout's). Add the page to `PUBLIC_PAGES` (`src/site.ts`) so it enters the sitemap.
- **Private page** (needs a session, or a form): `robots: privatePageRobots`, never in the sitemap.
  Don't disallow it in robots.txt (crawlers must be able to read its `noindex`).
- **Absolute URLs come from `SITE_URL`** (baked at build: `next.config.ts` `env`, Docker
  `--build-arg SITE_URL`), never from `APP_URL` or the request: `absoluteUrl()`, `metadataBase`.
- One `<h1>` per page, descriptive titles and descriptions per language (in the dictionaries),
  `alt` on meaningful images, internal links through `href(locale, path)`.
- **JSON-LD** through `<JsonLd data={structuredData(...)} />`: extend the graph (stable `@id`s),
  don't add unrelated scripts. Keep the facts in sync with the visible content.
- **Link preview image**: `app/[lang]/opengraph-image.tsx` (Geist from
  `packages/ui/assets/fonts`, traced in `next.config.ts`); `twitter-image.tsx` re-exports it. A site
  whose articles have their own covers can't use it (a file-based image overrides page metadata):
  the business sites draw their card (`ogCard` of `createSite`, rendered by `@web/site-kit/og`) and
  serve it from a Route Handler (`app/og/[image]/route.ts` re-exports `site.routes.ogImage`).
- **Business sites** (`@web/site-kit`, ADRs 0042, 0045): the kit builds everything above
  (`site.pageMetadata`, `site.structuredData` with an `Article` on article pages, the sitemap from
  `website.publicPages` + the articles, robots); a site never writes its own `seo.ts`
  (`npm run check:sites`). Their URLs are permanent: change one only with a redirect.
- **Icons**: edit `src/app/icon.svg` / `assets/icon-maskable.svg`, then `npm run icons` (in
  `web/`) and commit the generated files. Never hand-edit the PNG/ICO outputs.
- Root metadata files (`robots.txt`, `sitemap.xml`, `manifest.webmanifest`, icons) must stay
  excluded from the proxy matcher (otherwise they are redirected to a locale).
- Check after a change: `npm run build -w portfolio-web`, then the `<head>` of `/en` and `/vi`,
  `/sitemap.xml`, `/robots.txt`, `/en/opengraph-image`.
