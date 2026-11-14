import { defineWebsite } from '@web/site-kit/website';
import { business } from '@/content/business';

/**
 * A salon in Wendell, NC: English first (ADR 0038), US formats and clock, US dollars. The URLs of
 * the salon's earlier website, kept for search engines and its SMS program (/blog, /privacy-policy,
 * /terms-of-service; no data deletion page), with the salon's own legal texts and their effective
 * dates (src/i18n/messages, `legal`). Client-safe: the proxy and the booking use it.
 */
export const website = defineWebsite(business, {
  locales: ['en', 'vi'],
  intl: { en: 'en-US' },
  timeZone: 'America/New_York',
  currency: 'USD',
  paths: { articles: '/blog', topics: '/blog/topic', legal: { privacy: '/privacy-policy', terms: '/terms-of-service' } },
  legalUpdated: { privacy: '2023-05-19', terms: '2026-01-01' },
});
