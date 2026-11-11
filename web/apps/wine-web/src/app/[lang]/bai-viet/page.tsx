import type { Metadata } from 'next';
import { Container } from '@web/ui';
import { ArticleGrid, FeaturedArticle } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, listArticles } from '@/features/articles/data';
import { getLocale, getMessages } from '@/i18n/messages';
import { publicPageMetadata } from '@/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return publicPageMetadata({ locale, path: articlePaths.index, title: t.articles.metaTitle, description: t.articles.metaDescription });
}

/** All articles: the featured one as a spread, then the rest, newest first. Prerendered per language. */
export default async function ArticlesPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const articles = await listArticles(locale);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = articles.filter((article) => article !== featured);

  return (
    <>
      <ArticlesHeader title={t.articles.title} intro={t.articles.intro} locale={locale} t={t} />
      <Container className="space-y-20 py-14 sm:py-20">
        {featured && <FeaturedArticle article={featured} locale={locale} t={t} />}
        {rest.length > 0 && <ArticleGrid articles={rest} locale={locale} t={t} headingLevel="h2" />}
      </Container>
    </>
  );
}
