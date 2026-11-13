import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Phone } from 'lucide-react';
import { Container } from '@web/ui';
import { CoverImage } from '@web/ui/cover-image';
import { Band } from '@/components/band';
import { pill } from '@/components/pill';
import { salon } from '@/content/salon';
import { ArticleBody } from '@/features/articles/article-body';
import { ArticleGrid, ArticleMeta, TopicChip } from '@/features/articles/article-card';
import { articlePaths, getArticle, listArticles, slugInLocale } from '@/features/articles/data';
import { BookButton } from '@/features/booking/booking-provider';
import { href, isLocale } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { pageMetadata } from '@/seo';

/**
 * Fully static, also for a slug that wasn't prerendered: the request waits for the complete page,
 * so an unknown slug answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';

/** Every published article, prerendered per language with that language's slug (from the API). */
export async function generateStaticParams({ params }: { params: { lang: string } }) {
  const articles = isLocale(params.lang) ? await listArticles(params.lang) : [];
  // ensureStatic needs at least one entry: an unknown slug, answered by notFound().
  return articles.length ? articles.map((article) => ({ slug: article.slug })) : [{ slug: 'none' }];
}

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/[slug]'>): Promise<Metadata> {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) return {};
  return pageMetadata({
    t,
    locale,
    paths: Object.fromEntries(Object.entries(article.slugs).map(([code, own]) => [code, articlePaths.article(own)])),
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    article: { publishedTime: article.publishedAt },
    image:
      article.cover.kind === 'media'
        ? { url: article.cover.image.url, width: article.cover.image.width, height: article.cover.image.height, alt: article.cover.alt }
        : undefined,
  });
}

export default async function ArticlePage({ params }: PageProps<'/[lang]/blog/[slug]'>) {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) {
    // The slug of another language (language switch): the same article in this language.
    const own = await slugInLocale(locale, slug);
    if (own) permanentRedirect(href(locale, articlePaths.article(own)));
    notFound();
  }
  // An old slug (changed after publishing): permanent redirect to the current one.
  if (article.slug !== slug) permanentRedirect(href(locale, articlePaths.article(article.slug)));

  const all = await listArticles(locale);
  const others = all.filter((item) => item.id !== article.id);
  const related = [
    ...others.filter((item) => item.topic.key === article.topic.key),
    ...others.filter((item) => item.topic.key !== article.topic.key),
  ].slice(0, 3);
  const phone = salon.phones[0];

  return (
    <>
      <article className="overflow-x-clip">
        <header className="pt-10 sm:pt-12">
          <Container className="max-w-4xl">
            <nav aria-label={t.articles.breadcrumb}>
              <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <li>
                  <Link href={href(locale, '/')} className="hover:text-fg hover:underline">
                    {t.articles.home}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href(locale, articlePaths.index)} className="hover:text-fg hover:underline">
                    {t.articles.eyebrow}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href(locale, articlePaths.topic(article.topic.slug))} className="hover:text-fg hover:underline">
                    {article.topic.name}
                  </Link>
                </li>
              </ol>
            </nav>
            <TopicChip topic={article.topic} className="mt-8" />
            <h1 className="mt-4 text-4xl leading-[1.04] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-muted">{article.excerpt}</p>
            <ArticleMeta article={article} locale={locale} t={t} className="mt-6" />
          </Container>
        </header>

        <Container className="mt-10 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-surface-2">
            <CoverImage cover={article.cover} priority sizes="(min-width: 1024px) 1000px, 100vw" className="size-full object-cover" />
          </div>
        </Container>

        <Container className="max-w-3xl py-12 sm:py-16">
          <ArticleBody html={article.body} playLabel={t.articles.playVideo} />

          <div className="mt-14 border-t border-border pt-8">
            <Link href={href(locale, articlePaths.index)} className="inline-flex items-center gap-2 text-sm font-semibold hover:underline">
              <ArrowLeft aria-hidden className="size-4" />
              {t.articles.back}
            </Link>
          </div>

          {/* Call to book, in the site's rose bento. */}
          <aside className="mt-10 rounded-3xl bg-rose p-8 text-[#263238] sm:p-10">
            <p className="text-2xl font-extrabold tracking-[-0.02em]">{t.articles.ctaTitle}</p>
            <p className="mt-2 text-[#263238]/75">{t.articles.ctaText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <BookButton className={pill('ink', 'lg')}>
                {t.booking.open}
                <ArrowUpRight aria-hidden />
              </BookButton>
              <a href={phone.href} className={pill('glass', 'lg')}>
                <Phone aria-hidden />
                {phone.display}
              </a>
            </div>
          </aside>
        </Container>
      </article>

      {related.length > 0 && (
        <Band tone="mint">
          <section aria-labelledby="related">
            <h2 id="related" className="text-3xl font-extrabold tracking-[-0.03em]">
              {t.articles.related}
            </h2>
            <div className="mt-8">
              <ArticleGrid articles={related} locale={locale} t={t} />
            </div>
          </section>
        </Band>
      )}
    </>
  );
}
