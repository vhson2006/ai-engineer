import { siteProxy } from '@web/site-kit/proxy';
import { website } from '@/website';

/** CSRF origin check, language routing, security headers (ADR 0016), shared by the business sites. */
export const proxy = siteProxy(website.routing);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)'],
};
