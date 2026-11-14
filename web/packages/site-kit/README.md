# @web/site-kit

What every business site of the workspace shares (ADRs 0042, 0045): nails, wine, laundry and the
sample sites (sushi, travel, flowers, autoparts, hotel, spa) are all built on it. A site keeps
only what makes it itself: its facts, landing page, look and words. `npm run check:sites` (part
of `npm run check`) refuses a site that copies what the kit does.

## A site, file by file

| File | What |
|---|---|
| `src/content/business.ts` | The facts: `export const business = { … } satisfies Business` (name, phone, address, hours, schema.org type…). Catalogue data (menu, rooms, prices) next to it. |
| `src/website.ts` | `defineWebsite(business, options)`: languages, URLs, legal pages, formats. Client-safe (the proxy imports it). |
| `src/site.ts(x)` | `createSite({ website, siteUrl, loadMessages, … })`: the kit bound to this site. |
| `src/i18n/dictionaries.ts` | `mergeMessages(kit, site)` per language; the site's words in `messages/<lang>.json`. |
| `src/proxy.ts` | `siteProxy(website.routing)` + the app's `config.matcher`. |
| `src/app/[lang]/layout.tsx` | Fonts, `<html>`, the chrome: `<SiteShell>`, or the site's own header and footer built with `SkipLink`, `LegalLinks`, `website.localeOptions`. |
| `src/app/[lang]/page.tsx` | The landing page: the site's own sections, plus `LatestArticles`, `Faq`, `ContactSection` when they fit. |
| Customers' sign-in (ADR 0049) | `src/app/auth/{login,callback,logout}/route.ts` re-export `site.routes.authLogin / authCallback / authLogout`; `src/app/[lang]/login/page.tsx` and `[lang]/account/page.tsx` re-export `site.routes.login` / `.account`. `SiteHeader` shows `AccountLink`; a site's own header adds it (`@web/site-kit/components/account`). Env: `KEYCLOAK_ISSUER` (realm `site-<id>`), `API_KEYCLOAK_ISSUER`, `REDIS_URL`, `REDIS_KEY_PREFIX`, `SESSION_ENCRYPTION_KEY` (`.env.example`). |
| Shared routes | One-line re-exports of `site.routes.*`: articles index, topic, article, `legal(page)`, `NotFound`, `sitemap`, `robots`, `ogImage`, `articleOgImage`. The folder names follow the site's paths (`bai-viet/`, or `blog/` for nails). |
| `src/app/globals.css` | `@web/ui/theme.css`, `@web/ui/article-layout.css`, `@web/site-kit/theme.css`, `@source` both packages, then the site's tokens. |

## What a site can change

- **`defineWebsite` options** (defaults: the sample sites'): `locales` (order = the switcher's),
  `defaultLocale` (ADR 0038), `intl` (e.g. `{ en: 'en-US' }`), `timeZone`, `currency`,
  `paths.articles` / `paths.topics` / `paths.legal` (which legal pages exist, and where),
  `legalUpdated` (one date, or one per page).
- **`Business`**: `siteName` (titles, when shorter than `fullName`), `legalName`, `zaloHref` and
  `email` (optional: nothing is shown without them), `address.postalCode` / `country` /
  `locality`, `mapsHref` / `mapZoom`, `socials`, `schema.logo` / `schema.extra`.
- **`createSite` options**: `defaultImage`, or `ogCard` (the site draws its preview card, the kit
  renders it: `@web/site-kit/og`) and `articleOgCard`; `covers` (an article's fallback photo by
  topic); `article.share` (share bar), `article.cta` (the call to action under an article);
  `legal.facts` (extra `{placeholders}` of the site's own legal texts) and `legal.after`.
- **Words**: the site's dictionary is merged on top of the kit's, one level deep: reword any
  kit string (`articles.back`), or give your own legal texts (`legal.privacy`…: they replace the
  kit's, describe what YOUR site does, and move `legalUpdated`).
- **Look**: tokens in `globals.css` (`--brand-strong`, `--accent`, `--deep`, `--card-radius`,
  `--button-radius`, `--heading-*`, `--font-heading`), and the class hooks of the kit's pages:
  `.article-masthead`, `.article-cover`, `.article-cta`, `.topic-chip`, `.article-body`.

## A new site

Its app here (`apps/<id>-web`, the files above; `npm run check:sites` lists what is missing), then its
entry in `k8s/sites/sites.json` and `npm run sites:generate` at the repo root: its Kubernetes folder,
Keycloak client and customers' realm (k8s/README.md, "Business sites").

## Changing the kit

- A change here reaches every site: run `npm run check` (all workspaces) and look at two sites
  that differ (sushi and nails) before merging.
- Keep it generic: no site's name, colour or business rule in the kit. A need of one site is an
  option or a slot with today's behaviour as the default.
- Tests next to the code (`*.test.ts`): `website.test.ts`, `messages.test.ts`, `format.test.ts`.
