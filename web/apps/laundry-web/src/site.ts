/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021). Every
 * absolute URL for search engines and link previews (Facebook, Zalo, TikTok…) is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3400';

/**
 * Legal pages: the same path in every language (like /bai-viet). Social platforms ask for these
 * URLs when an app or a login is registered (privacy policy, terms, data deletion instructions):
 * keep them stable.
 */
export const LEGAL_PATHS = {
  privacy: '/chinh-sach-bao-mat',
  terms: '/dieu-khoan-su-dung',
  dataDeletion: '/xoa-du-lieu',
} as const;
export type LegalPage = keyof typeof LEGAL_PATHS;

/** When the legal texts last changed: shown on the pages, in their metadata and in the sitemap. */
export const LEGAL_UPDATED = '2026-11-12';

/** Public pages that exist in every language under the same path (the sitemap adds the articles). */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/bai-viet', priority: 0.8, changeFrequency: 'weekly' },
  { path: LEGAL_PATHS.privacy, priority: 0.2, changeFrequency: 'yearly' },
  { path: LEGAL_PATHS.terms, priority: 0.2, changeFrequency: 'yearly' },
  { path: LEGAL_PATHS.dataDeletion, priority: 0.2, changeFrequency: 'yearly' },
] as const;

/** Prerendered once per build: the sitemap's lastModified for the fixed pages. */
export const BUILT_AT = new Date();
