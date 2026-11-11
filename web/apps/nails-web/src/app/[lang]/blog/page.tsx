import type { Metadata } from 'next';
import { Band } from '@/components/band';
import { ArticleGrid, FeaturedArticle } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, listArticles } from '@/features/articles/data';
import { blogMetadata } from '@/features/articles/metadata';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return blogMetadata({ locale, path: articlePaths.index, title: t.articles.metaTitle, description: t.articles.metaDescription });
}

/** Every article: the featured one as a wide bento, then the rest, newest first. Prerendered per language. */
export default async function BlogPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const articles = await listArticles(locale);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = articles.filter((article) => article !== featured);

  return (
    <Band tone="white" className="pt-10 sm:pt-14">
      <ArticlesHeader title={t.articles.title} intro={t.articles.intro} locale={locale} t={t} />
      <div className="mt-12 space-y-3 sm:space-y-4">
        {featured && <FeaturedArticle article={featured} locale={locale} t={t} />}
        {rest.length > 0 && <ArticleGrid articles={rest} locale={locale} t={t} headingLevel="h2" />}
      </div>
    </Band>
  );
}
