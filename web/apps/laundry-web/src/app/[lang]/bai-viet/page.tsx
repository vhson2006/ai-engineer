import type { Metadata } from 'next';
import { Container } from '@web/ui';
import { ArticleGrid, FeaturedArticle } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, listArticles } from '@/features/articles/data';
import { articlesMetadata, samePath } from '@/features/articles/metadata';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return articlesMetadata({ locale, paths: samePath(articlePaths.index), title: t.articles.metaTitle, description: t.articles.metaDescription });
}

/** All published articles: the featured one as a spread, then the rest, newest first (API, cached). */
export default async function ArticlesPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const articles = await listArticles(locale);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = articles.filter((article) => article !== featured);

  return (
    <>
      <ArticlesHeader title={t.articles.title} intro={t.articles.intro} locale={locale} t={t} />
      <Container className="space-y-16 py-14 sm:py-20">
        {featured ? (
          <FeaturedArticle article={featured} locale={locale} t={t} />
        ) : (
          <p className="rounded-3xl bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.none}</p>
        )}
        {rest.length > 0 && <ArticleGrid articles={rest} locale={locale} t={t} headingLevel="h2" />}
      </Container>
    </>
  );
}
