# 0038. Public sites open in their own language, not the browser's

- **Status:** Accepted, implemented
- **Date:** 2026-11-12
- **Related:** 0020 (amends its redirect rule for public sites), `web/packages/core/src/i18n/routing.ts`,
  each app's `src/i18n/locales.ts`

## Context

ADR 0020 sends a visitor without a saved choice to their browser's language (`Accept-Language`).
For the public sites the owner wants a fixed first language: the salon in North Carolina in
English (even for a Vietnamese phone), the laundry, the winery and the portfolio in Vietnamese.
In development every app runs on `localhost` and cookies ignore the port, so the one
`NEXT_LOCALE` cookie was shared: switching laundry to Vietnamese also opened nails in Vietnamese.

## Decision

- `LocaleRouting.detectLanguage: false` on the public sites: `/` (or a path without a language)
  goes to the saved choice, else the site's `defaultLocale`; `Accept-Language` is not used.
  Defaults: nails-web `en`; laundry-web, wine-web, portfolio-web `vi` (portfolio was `en`).
- `LocaleRouting.cookieName`: each client site remembers the choice in its own cookie
  (`nails_locale`, `laundry_locale`, `wine_locale`; `rememberLocale(…, ROUTING)`). portfolio-web
  and admin-web keep `NEXT_LOCALE`, which the `/auth/*` handlers read.
- admin-web is unchanged (browser language, then English).

## Consequences

- A visitor whose browser prefers the other language sees the site's language first and uses
  the language switcher once; the choice is then remembered (1 year).
- Search engines are unaffected: every page has its own URL per language and hreflang.
- The laundry privacy policy names its cookie (`laundry_locale`).

## Alternatives considered

- **Keep Accept-Language**: what the owner explicitly did not want.
- **Separate dev hostnames per app instead of cookie names**: fixes only dev, and needs hosts or
  DNS setup on every machine.
