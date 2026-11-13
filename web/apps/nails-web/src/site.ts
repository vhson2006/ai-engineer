/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021). Every
 * absolute URL for search engines and link previews (Facebook, Instagram, X…) is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3200';

/**
 * Legal pages: the same paths as on the salon's current website (its SMS program registration and
 * booking messages link to them), in every language: keep them stable.
 */
export const LEGAL_PATHS = {
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
} as const;
export type LegalPage = keyof typeof LEGAL_PATHS;

/** Effective dates printed on the salon's own documents (envynailsspaofwendell.com). */
export const LEGAL_EFFECTIVE: Record<LegalPage, string> = {
  privacy: '2023-05-19',
  terms: '2026-01-01',
};

/** Public pages that exist in every language under the same path (the sitemap adds the articles). */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: LEGAL_PATHS.privacy, priority: 0.2, changeFrequency: 'yearly' },
  { path: LEGAL_PATHS.terms, priority: 0.2, changeFrequency: 'yearly' },
] as const;

/** Prerendered once per build: the sitemap's lastModified for the fixed pages. */
export const BUILT_AT = new Date();
