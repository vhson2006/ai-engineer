import { createSite } from '@web/site-kit/site';
import { ArticleCta } from '@/components/article-cta';
import { loadMessages } from '@/i18n/dictionaries';
import { nailsCard } from '@/og-card';
import { website } from '@/website';
import classicFrench from '../public/images/gallery/envy-3.png';
import milkyPink from '../public/images/gallery/envy-4.jpg';
import mintGoldFoil from '../public/images/gallery/envy-8.png';

/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021). Every
 * absolute URL for search engines and link previews (Facebook, Instagram, X…) is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3200';

/**
 * Envy Nails Spa of Wendell on the business-site kit (ADR 0042): locale and dictionary of the
 * page, SEO, the blog from content-service (site `nails`, ADR 0032) and the shared routes. Link
 * previews: the bento card per language (src/og-card.tsx). Under an article: a call to book.
 */
export const site = createSite({
  website,
  siteUrl: SITE_URL,
  loadMessages,
  ogCard: async (_locale, t) =>
    nailsCard({ kicker: t.hero.eyebrow, title: t.hero.title, accent: t.hero.titleAccent, footer: website.business.phone.display }),
  schemaImages: ['/images/spa-candle.jpg'],
  covers: { fallback: mintGoldFoil, byTopic: { care: milkyPink, services: classicFrench, salon: mintGoldFoil } },
  article: { cta: (t) => <ArticleCta t={t} /> },
});
