import { createSite } from '@web/site-kit/site';
import { loadMessages } from '@/i18n/dictionaries';
import { website } from '@/website';
import bouquetBlush from '../public/images/bouquet-blush.jpg';
import care from '../public/images/care.jpg';
import workshop from '../public/images/workshop.jpg';

/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021): every
 * absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3700';

/**
 * Bông Florist bound to the shared business-site kit (ADR 0042): locale and dictionary of the
 * page, SEO, articles from content-service (site `flowers`, ADR 0032) and the shared routes.
 * Article covers when the admins chose none: a photo of the business by topic key.
 */
export const site = createSite({
  website,
  siteUrl: SITE_URL,
  loadMessages,
  defaultImage: { url: '/images/og-default.jpg', width: 1200, height: 630 },
  schemaImages: ['/images/workshop.jpg', '/images/bouquet-blush.jpg', '/images/bouquet-garden.jpg'],
  covers: { fallback: workshop, byTopic: { care: care, occasions: bouquetBlush, guide: workshop } },
});
