import type { MetadataRoute } from 'next';

/** /robots.txt: the admin site is never crawled (also X-Robots-Tag: noindex and robots metadata). */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
