/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021).
 * Every absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://www.localtest.me:8000';

/** Public, indexable pages (each exists in every language). Private pages are never listed. */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  // Case studies (src/content/projects.ts).
  { path: '/projects/nails', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/projects/laundry', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/projects/wine', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/projects/wedding', priority: 0.6, changeFrequency: 'monthly' },
] as const;

/**
 * Sign-in and the dashboard (the live client of the deployment API). Temporarily OFF: no links,
 * no "Sign in" button, and /login, /dashboard, /auth/login answer 404. Set to true to bring them
 * back (they need the stack: Keycloak, Redis, KrakenD).
 */
export const ACCOUNT_ENABLED = false;

/** Prerendered once per build: the sitemap's lastModified. */
export const BUILT_AT = new Date();
