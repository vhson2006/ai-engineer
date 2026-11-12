# 0020. Languages: sub-path routing and JSON dictionaries, without an i18n library

- **Status:** Accepted; for the public sites the browser language is no longer used (0038)
- **Date:** 2026-11-07
- **Related:** 0016, 0019, `web/.claude/rules/i18n.md`, `web/packages/core/src/i18n/`,
  `web/apps/portfolio-web/src/i18n/`

## Context

The user site must be available in English and Vietnamese, with a language menu, and stay easy
to extend to more languages; the admin site will need the same. Pages are prerendered with Cache
Components (static shell, session parts streamed), and the CSP is computed in the proxy.

## Decision

- **Sub-path routing**: every page under `app/[lang]` (`/en/about`, `/vi/about`), prerendered
  once per language (`generateStaticParams` in the root layout). `/` and paths without a locale
  are redirected (307) by the proxy to the saved choice (cookie `NEXT_LOCALE`), else
  `Accept-Language`, else English. Route Handlers (`/auth/*`, `/files/*`) are not localized.
- **One JSON dictionary per language** (`src/i18n/messages/<lang>.json`), loaded on the server
  only, read through `next/root-params` (`getMessages()`), English as the reference type;
  personal content is in the dictionaries too, so the whole site is translated.
- **No library** (next-intl etc.): Next.js 16's built-in pattern plus small shared helpers in
  `@web/core/i18n` (negotiation, routing, format/plural) and the language menu in `@web/ui`.
- The visited page's language is remembered; router prefetches never change it. Keycloak's login
  page receives `ui_locales`.

## Consequences

- Each language is fully static HTML (good for speed and SEO), and dictionaries never reach the
  client bundle: Client Components get their strings as props.
- Every internal link and form action must carry the locale (`href(locale, path)`).
- A missing key fails `tsc`; extra/empty keys and placeholder mismatches fail the tests.
- `hreflang` alternates, the multilingual sitemap and per-language link previews: ADR 0021.
- Not done: translated URL slugs, Keycloak realm translations (the realm must enable
  internationalization and the language).

## Alternatives considered

- **next-intl**: richer (ICU messages, typed hooks), but another dependency and its own
  middleware next to ours; our needs are covered by ~150 lines. Can be adopted later: the JSON
  files are compatible.
- **Language from a cookie only, same URLs**: pages couldn't be prerendered per language and
  links couldn't be shared in a given language. Rejected.
- **Domain per language**: needs more hosts and certificates. Rejected.
