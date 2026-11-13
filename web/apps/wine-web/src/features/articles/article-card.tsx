import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { CoverImage } from '@web/ui/cover-image';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatInstantDate } from '@/lib/format';
import { articlePaths, type ArticleSummary, type Topic } from './data';

type Props = { article: ArticleSummary; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' };

/** Date · reading time, as a small meta line. */
export function ArticleMeta({ article, locale, t, className }: Omit<Props, 'headingLevel'> & { className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted', className)}>
      <time dateTime={article.publishedAt}>{formatInstantDate(locale, article.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="size-3.5" />
        {format(t.articles.minutes, { count: article.readingMinutes })}
      </span>
    </p>
  );
}

/** The topic as a small yellow label (the brochure's product-page color). */
export function CategoryChip({ topic, className }: { topic: Topic; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-full bg-yellow px-3 py-1 text-xs font-bold tracking-wide text-[#3f0a0d] uppercase', className)}>
      {topic.name}
    </span>
  );
}

/**
 * An article in a list: cover, topic, title, excerpt, meta. The whole card is clickable through
 * the title link (stretched with ::after), so there is one link per card for screen readers.
 */
export function ArticleCard({ article, locale, t, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-2">
        {/* Decorative here (alt=""): the title is the card's link. */}
        <CoverImage
          cover={article.cover}
          decorative
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <CategoryChip topic={article.topic} className="absolute top-4 left-4" />
      </div>
      <ArticleMeta article={article} locale={locale} t={t} className="mt-5" />
      <Heading className="mt-2 font-display text-2xl leading-snug font-bold text-balance text-fg">
        <Link
          href={href(locale, articlePaths.article(article.slug))}
          className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none group-hover:text-brand-strong focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
        >
          {article.title}
        </Link>
      </Heading>
      <p className="mt-2 line-clamp-3 flex-1 leading-relaxed text-muted">{article.excerpt}</p>
      <p aria-hidden className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-strong">
        {t.articles.readMore}
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </p>
    </article>
  );
}

/** The featured article: a wide, framed spread. */
export function FeaturedArticle({ article, locale, t }: Omit<Props, 'headingLevel'>) {
  return (
    <article className="group relative grid overflow-hidden rounded-[2.5rem] bg-deep text-white lg:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[26rem]">
        <CoverImage
          cover={article.cover}
          decorative
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="lattice relative flex flex-col justify-center p-8 sm:p-12">
        <p className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-[0.26em] text-gold-light uppercase">◆ {t.articles.featured}</span>
          <CategoryChip topic={article.topic} />
        </p>
        <h2 className="mt-5 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
          <Link
            href={href(locale, articlePaths.article(article.slug))}
            className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-yellow focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-yellow"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-white/80">{article.excerpt}</p>
        <ArticleMeta article={article} locale={locale} t={t} className="mt-6 text-white/70" />
        <p aria-hidden className="mt-6 inline-flex items-center gap-2 font-bold text-yellow">
          {t.articles.readMore}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </p>
      </div>
    </article>
  );
}

/** A responsive grid of article cards. */
export function ArticleGrid({ articles, locale, t, headingLevel }: { articles: ArticleSummary[]; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' }) {
  return (
    <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} locale={locale} t={t} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
