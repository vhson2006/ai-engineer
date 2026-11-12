import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/site';

/** /robots.txt: the whole site is public (no sign-in, no forms); the sitemap lists every page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
    host: new URL(SITE_URL).host,
  };
}
