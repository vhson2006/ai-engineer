import { createSite } from '@web/site-kit/site';
import { loadMessages } from '@/i18n/dictionaries';
import { website } from '@/website';
import haGiang from '../public/images/ha-giang.jpg';
import hoiAn from '../public/images/hoi-an.jpg';
import phuQuoc from '../public/images/phu-quoc.jpg';

/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021): every
 * absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3600';

/**
 * Gió Mùa Travel bound to the shared business-site kit (ADR 0042): locale and dictionary of the
 * page, SEO, articles from content-service (site `travel`, ADR 0032) and the shared routes.
 * Article covers when the admins chose none: a photo of the business by topic key.
 */
export const site = createSite({
  website,
  siteUrl: SITE_URL,
  loadMessages,
  defaultImage: { url: '/images/og-default.jpg', width: 1200, height: 630 },
  schemaImages: ['/images/ha-long.jpg', '/images/hoi-an.jpg', '/images/ha-giang.jpg'],
  covers: { fallback: hoiAn, byTopic: { destinations: haGiang, tips: phuQuoc, guide: hoiAn } },
});
