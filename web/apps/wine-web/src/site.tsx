import { createSite } from '@web/site-kit/site';
import { ArticleCta } from '@/components/article-cta';
import { LegalNotice } from '@/components/legal-notice';
import { loadMessages } from '@/i18n/dictionaries';
import { wineCard } from '@/og-card';
import { website } from '@/website';
import displayJars from '../public/images/display-jars.jpg';
import factory from '../public/images/factory.jpg';
import ruouCan from '../public/images/ruou-can.jpg';
import showroom from '../public/images/showroom.jpg';
import storefront from '../public/images/storefront.jpg';
import towerRack from '../public/images/tower-rack.jpg';

/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021). Every
 * absolute URL for search engines and link previews is built from it.
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3300';
const host = new URL(SITE_URL).host;

/**
 * Khang Hưng Tửu on the business-site kit (ADR 0042): locale and dictionary of the page, SEO,
 * articles from content-service (site `wine`, ADR 0032) and the shared routes. Link previews: the
 * brand card per language, and per article without a cover (src/og-card.tsx). Every call to buy
 * carries the alcohol notices (LegalNotice): the article's call to action, the legal pages.
 */
export const site = createSite({
  website,
  siteUrl: SITE_URL,
  loadMessages,
  ogCard: (_locale, t) => wineCard({ kicker: t.hero.eyebrow, title: t.hero.titleAccent, footer: t.notices.drive, host }),
  articleOgCard: (_locale, t, article) => wineCard({ kicker: article.topic.name, title: article.title, footer: t.notices.drive, host }),
  schemaImages: ['/images/storefront.jpg'],
  covers: { fallback: showroom, byTopic: { brand: storefront, craft: factory, serving: ruouCan, guide: displayJars, partners: towerRack } },
  article: { share: true, cta: (t) => <ArticleCta t={t} /> },
  legal: { facts: { zalo: '0939 7777 97' }, after: (t) => <LegalNotice t={t} className="mt-12" /> },
});
