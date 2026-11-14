import { NextResponse, type NextRequest } from 'next/server';
import { rememberLocale, routeLocale, type LocaleRouting } from '@web/core/i18n/routing';
import { rejectCrossSite } from '@web/core/security/csrf';
import { securityHeaders } from '@web/core/security/headers';
import type { Locale } from './locales';

/**
 * The proxy of a business site: the same three jobs as every app (CSRF origin check, language
 * routing, runtime security headers, ADR 0016). No sign-in, so no Keycloak origin in the CSP.
 * Frames: the Google Maps embed of the contact section and YouTube embeds of articles (ADR 0040);
 * images: their thumbnails. The site's `config.matcher` stays in its own src/proxy.ts (Next.js
 * reads it statically).
 */
export function siteProxy(routing: LocaleRouting<Locale>) {
  let cached: Record<string, string> | undefined;
  const headersFromEnv = () => {
    if (cached) return cached;
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error('Missing environment variable APP_URL (see .env.example)');
    cached = securityHeaders({
      appUrl,
      storageOrigins: (process.env.STORAGE_ORIGINS ?? '').split(/[\s,]+/).filter(Boolean),
      frameOrigins: ['https://www.google.com', 'https://www.youtube-nocookie.com'],
      imageOrigins: ['https://i.ytimg.com'],
      dev: process.env.NODE_ENV === 'development',
    });
    return cached;
  };

  return function proxy(request: NextRequest) {
    const blocked = rejectCrossSite(request);
    if (blocked) return blocked;
    const i18n = routeLocale(request, routing);
    const response = i18n.redirect ?? NextResponse.next();
    rememberLocale(request, response, i18n.locale, routing);
    for (const [name, value] of Object.entries(headersFromEnv())) response.headers.set(name, value);
    return response;
  };
}
