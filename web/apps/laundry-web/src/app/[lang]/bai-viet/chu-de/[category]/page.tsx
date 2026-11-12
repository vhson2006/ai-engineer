import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { ArticleGrid } from '@/features/articles/article-card';
import { ArticlesHeader } from '@/features/articles/articles-header';
import { articlePaths, listArticles, listTopics, topicBySlug, topicSlugInLocale } from '@/features/articles/data';
import { pageMetadata } from '@/seo';
import { href, isLocale } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/**
 * Fully static, also for a segment that wasn't prerendered: the request waits for the complete
 * page, so an unknown topic answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';

/** One page per topic, in each language with that language's slug (from the API). */
export async function generateStaticParams({ params }: { params: { lang: string } }) {
  const topics = isLocale(params.lang) ? await listTopics(params.lang) : [];
  // ensureStatic needs at least one entry: an unknown segment, answered by notFound().
  return topics.length ? topics.map((topic) => ({ category: topic.slug })) : [{ category: 'none' }];
}

export async function generateMetadata({ params }: PageProps<'/[lang]/bai-viet/chu-de/[category]'>): Promise<Metadata> {
  const [{ category: segment }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const topic = await topicBySlug(locale, segment);
  if (!topic) return {};
  return pageMetadata({
    t,
    locale,
    paths: Object.fromEntries(Object.entries(topic.slugs).map(([code, slug]) => [code, articlePaths.topic(slug)])),
    title: format(t.articles.categoryTitle, { category: topic.name }),
    description: format(t.articles.categoryDescription, { category: topic.name.toLowerCase() }),
  });
}

export default async function TopicPage({ params }: PageProps<'/[lang]/bai-viet/chu-de/[category]'>) {
  const [{ category: segment }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const topic = await topicBySlug(locale, segment);
  if (!topic) {
    // The segment of another language (language switch): the same topic in this language.
    const own = await topicSlugInLocale(locale, segment);
    if (own) permanentRedirect(href(locale, articlePaths.topic(own)));
    notFound();
  }
  const articles = await listArticles(locale, topic.slug);

  return (
    <>
      <ArticlesHeader
        title={format(t.articles.categoryTitle, { category: topic.name })}
        intro={format(t.articles.categoryDescription, { category: topic.name.toLowerCase() })}
        active={topic.key}
        locale={locale}
        t={t}
      />
      <Container className="py-14 sm:py-20">
        {articles.length > 0 ? (
          <ArticleGrid articles={articles} locale={locale} t={t} headingLevel="h2" />
        ) : (
          <p className="rounded-3xl bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.empty}</p>
        )}
      </Container>
    </>
  );
}
