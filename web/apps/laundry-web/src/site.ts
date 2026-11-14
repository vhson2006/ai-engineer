import { createSite } from '@web/site-kit/site';
import { loadMessages } from '@/i18n/dictionaries';
import { website } from '@/website';
import coverShop from '../public/images/cover-shop.jpg';
import machines from '../public/images/machines.jpg';
import shelves from '../public/images/shelves.jpg';

/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021). Every
 * absolute URL for search engines and link previews (Facebook, Zalo, TikTok…) is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3400';

/**
 * Giặt sấy SFaster on the business-site kit (ADR 0042): locale and dictionary of the page, SEO,
 * articles from content-service (site `laundry`, ADR 0032) and the shared routes. Article covers
 * when the admins chose none: a photo of the shop by topic key.
 */
export const site = createSite({
  website,
  siteUrl: SITE_URL,
  loadMessages,
  defaultImage: { url: '/images/og-default.jpg', width: 1200, height: 630 },
  schemaImages: ['/images/machines.jpg', '/images/shelves.jpg'],
  covers: { fallback: coverShop, byTopic: { tips: shelves, services: machines, shop: coverShop } },
});
