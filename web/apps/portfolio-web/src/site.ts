/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021).
 * Every absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://www.localtest.me:8000';

/** Public, indexable pages (each exists in every language). Private pages are never listed. */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
] as const;

/** Prerendered once per build: the sitemap's lastModified. */
export const BUILT_AT = new Date();
