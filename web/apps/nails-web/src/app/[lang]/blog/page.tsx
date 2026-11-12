import type { Metadata } from 'next';
import { Band } from '@/components/band';
import { ArticleGrid, FeaturedArticle } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, listArticles } from '@/features/articles/data';
import { getLocale, getMessages } from '@/i18n/messages';
import { pageMetadata, samePath } from '@/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return pageMetadata({ t, locale, paths: samePath(articlePaths.index), title: t.articles.metaTitle, description: t.articles.metaDescription });
}

/** All published articles: the featured one as a wide bento, then the rest, newest first (API, cached). */
export default async function BlogPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const articles = await listArticles(locale);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = articles.filter((article) => article !== featured);

  return (
    <Band tone="white" className="pt-10 sm:pt-12">
      <ArticlesHeader title={t.articles.title} intro={t.articles.intro} locale={locale} t={t} />
      <div className="mt-10 space-y-3 sm:space-y-4">
        {featured ? (
          <FeaturedArticle article={featured} locale={locale} t={t} />
        ) : (
          <p className="rounded-3xl bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.none}</p>
        )}
        {rest.length > 0 && <ArticleGrid articles={rest} locale={locale} t={t} headingLevel="h2" />}
      </div>
    </Band>
  );
}
