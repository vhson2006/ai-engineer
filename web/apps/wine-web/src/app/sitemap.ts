import type { MetadataRoute } from 'next';
import { localizedSitemap } from '@web/core/i18n/seo';
import { articlePaths, articleSlugs, CATEGORIES } from '@/features/articles/data';
import { LOCALE_CODES } from '@/i18n/locales';
import { BUILT_AT, PUBLIC_PAGES, SITE_URL } from '@/site';

/**
 * /sitemap.xml: every public page and article in every language, with hreflang alternates
 * (ADR 0021). Articles carry their publication date.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...localizedSitemap(SITE_URL, LOCALE_CODES, PUBLIC_PAGES, BUILT_AT),
    ...localizedSitemap(
      SITE_URL,
      LOCALE_CODES,
      CATEGORIES.map((category) => ({ path: articlePaths.category(category), priority: 0.5, changeFrequency: 'weekly' as const })),
      BUILT_AT,
    ),
    ...articleSlugs().flatMap(({ slug, publishedAt }) =>
      localizedSitemap(SITE_URL, LOCALE_CODES, [{ path: articlePaths.article(slug), priority: 0.7, changeFrequency: 'monthly' }], new Date(publishedAt)),
    ),
  ];
}
