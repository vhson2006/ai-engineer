import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from '@web/core/i18n/format';
import { Band } from '@/components/band';
import { ArticleGrid } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, CATEGORIES, CATEGORY_SLUGS, categoryFromSlug, listArticles } from '@/features/articles/data';
import { blogMetadata } from '@/features/articles/metadata';
import { getLocale, getMessages } from '@/i18n/messages';

/**
 * Fully static, also for a segment that wasn't prerendered: the request waits for the complete
 * page, so an unknown topic answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';

/** One static page per topic and language. */
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: CATEGORY_SLUGS[category] }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/topic/[category]'>): Promise<Metadata> {
  const [{ category: segment }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const category = categoryFromSlug(segment);
  if (!category) return {};
  const name = t.articles.categories[category];
  return blogMetadata({
    locale,
    path: articlePaths.category(category),
    title: format(t.articles.categoryTitle, { category: name }),
    description: format(t.articles.categoryDescription, { category: name.toLowerCase() }),
  });
}

export default async function TopicPage({ params }: PageProps<'/[lang]/blog/topic/[category]'>) {
  const [{ category: segment }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const category = categoryFromSlug(segment);
  if (!category) notFound();
  const articles = await listArticles(locale, category);
  const name = t.articles.categories[category];

  return (
    <Band tone="white" className="pt-10 sm:pt-14">
      <ArticlesHeader
        title={format(t.articles.categoryTitle, { category: name })}
        intro={format(t.articles.categoryDescription, { category: name.toLowerCase() })}
        active={category}
        locale={locale}
        t={t}
      />
      <div className="mt-12">
        {articles.length > 0 ? (
          <ArticleGrid articles={articles} locale={locale} t={t} headingLevel="h2" />
        ) : (
          <p className="rounded-3xl bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.empty}</p>
        )}
      </div>
    </Band>
  );
}
