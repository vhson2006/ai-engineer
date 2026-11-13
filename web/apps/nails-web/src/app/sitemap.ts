import type { MetadataRoute } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedSitemap } from '@web/core/i18n/seo';
import { articlePaths, listArticles } from '@/features/articles/data';
import { LOCALE_CODES } from '@/i18n/locales';
import { absoluteUrl } from '@/seo';
import { BUILT_AT, PUBLIC_PAGES, SITE_URL } from '@/site';

/**
 * /sitemap.xml: the fixed pages in every language with their hreflang alternates (ADR 0021), then
 * every published article in each language with its own slug. If the API is down, the fixed pages
 * are still served (articles are found again through /blog).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = localizedSitemap(SITE_URL, LOCALE_CODES, PUBLIC_PAGES, BUILT_AT);
  const articles = await Promise.all(
    LOCALE_CODES.map(async (locale) => {
      try {
        return (await listArticles(locale)).map((article) => ({
          url: absoluteUrl(localizedPath(locale, articlePaths.article(article.slug))),
          lastModified: new Date(article.publishedAt),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
      } catch {
        return [];
      }
    }),
  );
  return [...pages, ...articles.flat()];
}
