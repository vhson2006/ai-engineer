import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { STRONG, TINTS } from '@/components/bento';
import type { Tint } from '@/content/salon';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatDate } from '@/lib/format';
import { articlePaths, type ArticleCategory, type ArticleSummary } from './data';

/** Each topic's pastel, like the menu tabs. */
export const TOPIC_TINT: Record<ArticleCategory, Tint> = { care: 'mint', services: 'rose', salon: 'baby' };

type Props = { article: ArticleSummary; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' };

/** Date · reading time. */
export function ArticleMeta({ article, locale, t, className }: Omit<Props, 'headingLevel'> & { className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted', className)}>
      <time dateTime={article.publishedAt}>{formatDate(locale, article.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="size-3.5" />
        {format(t.articles.minutes, { count: article.readingMinutes })}
      </span>
    </p>
  );
}

/** The topic as a pastel pill with a colored dot. */
export function TopicChip({ category, t, className }: { category: ArticleCategory; t: Messages; className?: string }) {
  const tint = TOPIC_TINT[category];
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-[#263238]', TINTS[tint], className)}>
      <span aria-hidden className={cn('size-2 rounded-full', STRONG[tint])} />
      {t.articles.categories[category]}
    </span>
  );
}

/**
 * An article in a list: a bento card with the cover, topic, title, excerpt and meta. The whole
 * card is clickable through the title link (stretched with ::after): one link per card.
 */
export function ArticleCard({ article, locale, t, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface-2 transition duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#263238]/[0.06] motion-reduce:transform-none">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={article.cover}
          alt={article.coverAlt}
          placeholder="blur"
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <TopicChip category={article.category} t={t} className="absolute top-4 left-4" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ArticleMeta article={article} locale={locale} t={t} />
        <Heading className="mt-2 text-2xl leading-tight font-extrabold tracking-[-0.02em] text-balance">
          <Link
            href={href(locale, articlePaths.article(article.slug))}
            className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
          >
            {article.title}
          </Link>
        </Heading>
        <p className="mt-2 line-clamp-3 flex-1 leading-relaxed text-muted">{article.excerpt}</p>
        <p aria-hidden className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
          {t.articles.readMore}
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </p>
      </div>
    </article>
  );
}

/** The featured article: a wide bento in its topic's pastel. */
export function FeaturedArticle({ article, locale, t }: Omit<Props, 'headingLevel'>) {
  return (
    <article className={cn('group relative grid overflow-hidden rounded-3xl lg:grid-cols-[1.1fr_1fr]', TINTS[TOPIC_TINT[article.category]])}>
      <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[24rem]">
        <Image
          src={article.cover}
          alt={article.coverAlt}
          placeholder="blur"
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col justify-center p-8 text-[#263238] sm:p-12">
        <p className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] uppercase">{t.articles.featured}</span>
          <TopicChip category={article.category} t={t} className="bg-white/70" />
        </p>
        <h2 className="mt-5 text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
          <Link
            href={href(locale, articlePaths.article(article.slug))}
            className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-brand"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[#263238]/75">{article.excerpt}</p>
        <ArticleMeta article={article} locale={locale} t={t} className="mt-6 text-[#263238]/70" />
      </div>
    </article>
  );
}

/** A responsive grid of article cards. */
export function ArticleGrid({ articles, locale, t, headingLevel }: { articles: ArticleSummary[]; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.slug}>
          <ArticleCard article={article} locale={locale} t={t} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
