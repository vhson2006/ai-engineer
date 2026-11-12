import { NextResponse, type NextRequest } from 'next/server';
import { rememberLocale, routeLocale } from '@web/core/i18n/routing';
import { rejectCrossSite } from '@web/core/security/csrf';
import { securityHeaders } from '@web/core/security/headers';
import { ROUTING } from '@/i18n/locales';

/**
 * Same three jobs as the other apps' proxies (CSRF origin check, language routing, runtime
 * security headers, ADR 0016). This site has no sign-in, so the CSP has no Keycloak origin.
 */
export function proxy(request: NextRequest) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const i18n = routeLocale(request, ROUTING);
  const response = i18n.redirect ?? NextResponse.next();
  rememberLocale(request, response, i18n.locale, ROUTING);
  for (const [name, value] of Object.entries(headersFromEnv())) response.headers.set(name, value);
  return response;
}

let cached: Record<string, string> | undefined;

function headersFromEnv(): Record<string, string> {
  if (cached) return cached;
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('Missing environment variable APP_URL (see .env.example)');
  cached = securityHeaders({
    appUrl,
    storageOrigins: (process.env.STORAGE_ORIGINS ?? '').split(/[\s,]+/).filter(Boolean),
    // The Google Maps embed of the contact section (keyless, www.google.com/maps?…&output=embed).
    frameOrigins: ['https://www.google.com'],
    dev: process.env.NODE_ENV === 'development',
  });
  return cached;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)'],
};
