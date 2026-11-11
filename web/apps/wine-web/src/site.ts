/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021).
 * Every absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3300';

/** Public, indexable pages (each exists in every language). Articles are added from their data. */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/bai-viet', priority: 0.8, changeFrequency: 'daily' },
] as const;

/** Prerendered once per build: the sitemap's lastModified for pages without a date. */
export const BUILT_AT = new Date();
