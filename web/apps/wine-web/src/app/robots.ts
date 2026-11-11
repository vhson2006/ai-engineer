import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/site';

/** /robots.txt: everything public (the site has no private pages), plus the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
    host: new URL(SITE_URL).host,
  };
}
