import { NextResponse, type NextRequest } from 'next/server';
import { negotiateLocale } from './negotiate';
import { localeOfPath, localizedPath } from './paths';

export { localeOfPath, localizedPath };

/**
 * Locale routing for the proxy (sub-path strategy: /en/about, /vi/about). Every page lives under
 * app/[lang]; Route Handlers that aren't pages (/auth/*, /files/*) are listed in `bypass`.
 *
 *   const i18n = routeLocale(request, ROUTING);
 *   if (i18n.redirect) return i18n.redirect;      // /about → /vi/about
 *   ... NextResponse.next() ...
 *   rememberLocale(request, response, i18n.locale); // the visitor's choice, for the next visit
 */
export interface LocaleRouting<L extends string = string> {
  locales: readonly L[];
  defaultLocale: L;
  /** Path prefixes that are never localized (Route Handlers, e.g. '/auth/'). */
  bypass?: readonly string[];
}

/** Remembers the last language the visitor chose (not secret: a preference). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The visitor's locale: the cookie if it is supported, else Accept-Language, else the default. */
export function preferredLocale<L extends string>(request: NextRequest, routing: LocaleRouting<L>): L {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const fromCookie = routing.locales.find((locale) => locale === saved);
  return fromCookie ?? negotiateLocale(request.headers.get('accept-language'), routing.locales, routing.defaultLocale);
}

export function routeLocale<L extends string>(
  request: NextRequest,
  routing: LocaleRouting<L>,
): { locale?: L; redirect?: NextResponse } {
  const { pathname, search } = request.nextUrl;
  const locale = localeOfPath(pathname, routing.locales);
  if (locale) return { locale };
  if (routing.bypass?.some((prefix) => pathname.startsWith(prefix))) return {};
  // Only GET/HEAD are redirected: a POST must never be turned into a GET (Server Actions always
  // post to a localized page anyway).
  if (request.method !== 'GET' && request.method !== 'HEAD') return {};

  const url = request.nextUrl.clone();
  url.pathname = localizedPath(preferredLocale(request, routing), pathname);
  url.search = search;
  // 307: temporary (depends on the visitor), and never cached as permanent by browsers.
  return { redirect: NextResponse.redirect(url, 307) };
}

/**
 * Saves the page's locale in a cookie when it differs from the saved one, so `/` and links
 * without a locale (e.g. redirects from /auth/*) bring the visitor back to their language.
 * Router prefetches are skipped: hovering a language link must not switch the language.
 */
export function rememberLocale(request: NextRequest, response: NextResponse, locale: string | undefined): void {
  if (!locale || request.cookies.get(LOCALE_COOKIE)?.value === locale) return;
  if (request.headers.get('next-router-prefetch') || request.headers.get('purpose') === 'prefetch') return;
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
