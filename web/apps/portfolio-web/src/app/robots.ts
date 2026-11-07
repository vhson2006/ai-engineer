import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/site';

/**
 * /robots.txt. The private pages stay crawlable on purpose: they carry `noindex`, which a crawler
 * can only see if it may fetch them. /auth/* and /files/* are Route Handlers (a crawl would start
 * sign-ins and hit the rate limit): disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/auth/', '/files/'] }],
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
    host: new URL(SITE_URL).host,
  };
}
