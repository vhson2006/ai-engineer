import { NextResponse, type NextRequest } from 'next/server';
import { rememberLocale, routeLocale } from '@web/core/i18n/routing';
import { rejectCrossSite } from '@web/core/security/csrf';
import { securityHeadersFromEnv } from '@web/core/security/headers';
import { ROUTING } from '@/i18n/locales';

/**
 * Runs before every page and route (not static assets):
 *
 * 1. First line of CSRF defence: refuses any POST/PUT/PATCH/DELETE that doesn't come from this
 *    app's own origin, for every route, including Route Handlers and Server Actions added later.
 *    GET/HEAD/OPTIONS pass straight through (they must never change state). Not the only line:
 *    Route Handlers call rejectCrossSite() themselves too (@web/core/security/csrf).
 * 2. Language: a page path without a locale (/, /about, /login?error=… from /auth/*) is redirected
 *    to the visitor's language (saved choice, else Accept-Language, else English); the language of
 *    a visited page is saved in a cookie (@web/core/i18n/routing).
 * 3. Security headers computed from env at runtime: Content-Security-Policy, COOP…
 *    (@web/core/security/headers, ADR 0016), on every response including the redirects.
 */
export function proxy(request: NextRequest) {
  const blocked = rejectCrossSite(request);
  if (blocked) {
    console.warn(
      `[csrf] blocked ${request.method} ${request.nextUrl.pathname} origin=${request.headers.get('origin') ?? '-'} sec-fetch-site=${request.headers.get('sec-fetch-site') ?? '-'}`,
    );
    return blocked;
  }

  const i18n = routeLocale(request, ROUTING);
  const response = i18n.redirect ?? NextResponse.next();
  rememberLocale(request, response, i18n.locale);
  for (const [name, value] of Object.entries(securityHeadersFromEnv())) response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except build assets and static files (they are GET-only anyway), including the
  // metadata files at the root: robots.txt, icons.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)'],
};
