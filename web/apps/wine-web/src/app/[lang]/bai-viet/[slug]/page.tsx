import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { localizedPath } from '@web/core/i18n/paths';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@/components/json-ld';
import { LegalNotice } from '@/components/legal-notice';
import { winery } from '@/content/winery';
import { ArticleBody } from '@/features/articles/article-body';
import { ArticleGrid, ArticleMeta, CategoryChip } from '@/features/articles/article-card';
import { articlePaths, articleSlugs, getArticle, listArticles } from '@/features/articles/data';
import { ShareBar } from '@/features/articles/share-bar';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { absoluteUrl, publicPageMetadata, structuredData } from '@/seo';

/**
 * Fully static, also for a slug that wasn't prerendered: the request waits for the complete page,
 * so an unknown slug answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';

/** Every article, prerendered per language. */
export function generateStaticParams() {
  return articleSlugs().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/bai-viet/[slug]'>): Promise<Metadata> {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) return {};
  return publicPageMetadata({
    locale,
    path: articlePaths.article(slug),
    title: article.title,
    description: article.excerpt,
    article: { publishedTime: article.publishedAt, section: t.articles.categories[article.category] },
  });
}

export default async function ArticlePage({ params }: PageProps<'/[lang]/bai-viet/[slug]'>) {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) notFound();

  const all = await listArticles(locale);
  const sameTopic = all.filter((item) => item.slug !== slug && item.category === article.category);
  const related = [...sameTopic, ...all.filter((item) => item.slug !== slug && item.category !== article.category)].slice(0, 3);
  const path = articlePaths.article(slug);

  return (
    <>
      <article>
        <JsonLd
          data={structuredData(locale, {
            article: { path, title: article.title, description: article.excerpt, image: `${localizedPath(locale, path)}/opengraph-image`, publishedAt: article.publishedAt },
          })}
        />

        <header className="bg-surface-2">
          <Container className="max-w-4xl pt-10 pb-12 sm:pt-14">
            <nav aria-label={t.articles.breadcrumb}>
              <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <li>
                  <Link href={href(locale, '/')} className="hover:text-brand-strong hover:underline">
                    {t.nav.home}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href(locale, articlePaths.index)} className="hover:text-brand-strong hover:underline">
                    {t.articles.eyebrow}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href(locale, articlePaths.category(article.category))} className="hover:text-brand-strong hover:underline">
                    {t.articles.categories[article.category]}
                  </Link>
                </li>
              </ol>
            </nav>
            <CategoryChip article={article} t={t} className="mt-8" />
            <h1 className="mt-4 font-display text-4xl leading-[1.1] font-bold tracking-tight text-balance text-brand-strong sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-muted">{article.excerpt}</p>
            <ArticleMeta article={article} locale={locale} t={t} className="mt-6" />
          </Container>
        </header>

        <Container className="max-w-5xl">
          <div className="frame-ornate relative -mt-1 aspect-[16/9] overflow-hidden rounded-[2rem] p-1.5">
            <Image
              src={article.cover}
              alt={article.coverAlt}
              placeholder="blur"
              priority
              sizes="(min-width: 1024px) 1000px, 100vw"
              className="size-full rounded-[1.6rem] object-cover"
            />
          </div>
        </Container>

        <Container className="max-w-3xl py-14 sm:py-20">
          <ArticleBody blocks={article.body} />

          <div className="mt-14 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <ShareBar
              url={absoluteUrl(localizedPath(locale, path))}
              labels={{ share: t.articles.share, facebook: t.articles.shareFacebook, copy: t.articles.copyLink, copied: t.articles.copied }}
            />
            <Link href={href(locale, articlePaths.index)} className="inline-flex items-center gap-2 text-sm font-bold text-brand-strong hover:underline">
              <ArrowLeft aria-hidden className="size-4" />
              {t.articles.back}
            </Link>
          </div>

          {/* Contact box: a call to buy, so the legal notice sits right next to it. */}
          <aside className="lattice mt-12 rounded-[2rem] bg-brand p-8 text-white sm:p-10">
            <p className="font-display text-2xl font-bold text-yellow">{t.contact.title}</p>
            <p className="mt-2 text-white/85">{t.contact.text}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={winery.orderPhone.href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-full bg-yellow px-6 text-[#3f0a0d] hover:bg-yellow/90')}>
                <Phone aria-hidden />
                {winery.orderPhone.display}
              </a>
              <a
                href={winery.zalo.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-full border-white/30 bg-white/10 px-6 text-white hover:bg-white/20')}
              >
                <MessageCircle aria-hidden />
                {t.common.zalo}
              </a>
            </div>
            <LegalNotice tone="light" className="mt-6" />
          </aside>
        </Container>

      </article>

      {related.length > 0 && (
        <section aria-labelledby="related" className="border-t border-border bg-surface-2 py-16 sm:py-20">
          <Container>
            <h2 id="related" className="font-display text-3xl font-bold text-brand-strong">
              {t.articles.related}
            </h2>
            <div className="mt-10">
              <ArticleGrid articles={related} locale={locale} t={t} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
