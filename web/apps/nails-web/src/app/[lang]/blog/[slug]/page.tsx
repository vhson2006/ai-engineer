import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Phone } from 'lucide-react';
import { Container } from '@web/ui';
import { Band } from '@/components/band';
import { pill } from '@/components/pill';
import { salon } from '@/content/salon';
import { ArticleBody } from '@/features/articles/article-body';
import { ArticleGrid, ArticleMeta, TopicChip } from '@/features/articles/article-card';
import { articlePaths, articleSlugs, getArticle, listArticles } from '@/features/articles/data';
import { blogMetadata } from '@/features/articles/metadata';
import { BookButton } from '@/features/booking/booking-provider';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/**
 * Fully static, also for a slug that wasn't prerendered: the request waits for the complete page,
 * so an unknown slug answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';

/** Every article, prerendered per language. */
export function generateStaticParams() {
  return articleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) return {};
  return blogMetadata({ locale, path: articlePaths.article(slug), title: article.title, description: article.excerpt, publishedTime: article.publishedAt });
}

export default async function ArticlePage({ params }: PageProps<'/[lang]/blog/[slug]'>) {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) notFound();

  const all = await listArticles(locale);
  const others = all.filter((item) => item.slug !== slug);
  const related = [...others.filter((item) => item.category === article.category), ...others.filter((item) => item.category !== article.category)].slice(0, 3);
  const phone = salon.phones[0];

  return (
    <>
      <article>
        <header className="pt-10 sm:pt-14">
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
                  <Link href={href(locale, articlePaths.category(article.category))} className="hover:text-fg hover:underline">
                    {t.articles.categories[article.category]}
                  </Link>
                </li>
              </ol>
            </nav>
            <TopicChip category={article.category} t={t} className="mt-8" />
            <h1 className="mt-4 text-4xl leading-[1.04] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">{article.title}</h1>
            <p className="mt-5 text-xl leading-relaxed text-muted">{article.excerpt}</p>
            <ArticleMeta article={article} locale={locale} t={t} className="mt-6" />
          </Container>
        </header>

        <Container className="mt-10 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-surface-2">
            <Image src={article.cover} alt={article.coverAlt} placeholder="blur" priority sizes="(min-width: 1024px) 1000px, 100vw" className="size-full object-cover" />
          </div>
        </Container>

        <Container className="max-w-3xl py-14 sm:py-20">
          <ArticleBody blocks={article.body} />

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
            <div className="mt-10">
              <ArticleGrid articles={related} locale={locale} t={t} />
            </div>
          </section>
        </Band>
      )}
    </>
  );
}
