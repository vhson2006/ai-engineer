import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { Container, buttonVariants, cn } from '@web/ui';
import { shop } from '@/content/shop';
import { ArticleBody } from '@/features/articles/article-body';
import { ArticleGrid, ArticleMeta, TopicChip } from '@/features/articles/article-card';
import { CoverImage } from '@web/ui/cover-image';
import { articlePaths, getArticle, listArticles, slugInLocale } from '@/features/articles/data';
import { pageMetadata } from '@/seo';
import { href, isLocale } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

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

export async function generateMetadata({ params }: PageProps<'/[lang]/bai-viet/[slug]'>): Promise<Metadata> {
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

export default async function ArticlePage({ params }: PageProps<'/[lang]/bai-viet/[slug]'>) {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) {
    // The slug of another language (language switch): the same article in this language.
    const own = await slugInLocale(locale, slug);
    if (own) permanentRedirect(href(locale, articlePaths.article(own)));
    notFound();
  }
  // An old slug (changed after publishing): 301 to the current one, links and rankings follow.
  if (article.slug !== slug) permanentRedirect(href(locale, articlePaths.article(article.slug)));

  const all = await listArticles(locale);
  const others = all.filter((item) => item.id !== article.id);
  const related = [...others.filter((item) => item.topic.key === article.topic.key), ...others.filter((item) => item.topic.key !== article.topic.key)].slice(0, 3);

  return (
    <>
      <article className="overflow-x-clip">
        <header className="bg-surface-2">
          <Container className="max-w-4xl pt-10 pb-12 sm:pt-14">
            <nav aria-label={t.articles.breadcrumb}>
              <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <li>
                  <Link href={href(locale, '/')} className="hover:text-brand-strong hover:underline">
                    {t.articles.home}
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
                  <Link href={href(locale, articlePaths.topic(article.topic.slug))} className="hover:text-brand-strong hover:underline">
                    {article.topic.name}
                  </Link>
                </li>
              </ol>
            </nav>
            <TopicChip name={article.topic.name} className="mt-8" />
            <h1 className="mt-4 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-balance text-brand-strong sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-muted">{article.excerpt}</p>
            <ArticleMeta article={article} locale={locale} t={t} className="mt-6" />
          </Container>
        </header>

        <Container className="mt-10 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-surface-2">
            <CoverImage cover={article.cover} priority sizes="(min-width: 1024px) 1000px, 100vw" className="size-full object-cover" />
          </div>
        </Container>

        <Container className="max-w-3xl py-14 sm:py-20">
          <ArticleBody html={article.body} />

          <div className="mt-14 border-t border-border pt-8">
            <Link href={href(locale, articlePaths.index)} className="inline-flex items-center gap-2 text-sm font-bold text-brand-strong hover:underline">
              <ArrowLeft aria-hidden className="size-4" />
              {t.articles.back}
            </Link>
          </div>

          {/* Contact box: no booking form yet, so phone and Zalo. */}
          <aside className="bubbles mt-10 rounded-[2rem] bg-brand p-8 text-white sm:p-10">
            <p className="font-display text-2xl font-extrabold text-sun">{t.articles.ctaTitle}</p>
            <p className="mt-2 text-white/85">{t.articles.ctaText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={shop.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-full bg-sun px-6 text-deep hover:bg-[#ffe14d]')}>
                <Phone aria-hidden />
                {shop.phone.display}
              </a>
              <a
                href={shop.zaloHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-full border-white/30 bg-white/10 px-6 text-white hover:bg-white/20')}
              >
                <MessageCircle aria-hidden />
                Zalo
              </a>
            </div>
          </aside>
        </Container>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related" className="border-t border-border bg-surface-2 py-16 sm:py-20">
          <Container>
            <h2 id="related" className="font-display text-3xl font-extrabold text-brand-strong">
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
