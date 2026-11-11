import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatInstantDate } from '@/lib/format';
import { articlePaths, type ArticleSummary } from './data';

type Props = { article: ArticleSummary; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' };

/** Date · reading time. */
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

/** The topic as a small sun-yellow label (the shop sign's accent). */
export function TopicChip({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-full bg-sun px-3 py-1 text-xs font-bold tracking-wide text-deep uppercase', className)}>
      {name}
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface transition-shadow duration-300 hover:shadow-xl hover:shadow-brand/10">
      {/* Covers: a photo of the shop chosen by topic until covers are uploaded (decorative, alt=""). */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <Image
          src={article.cover}
          alt=""
          placeholder="blur"
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <TopicChip name={article.topic.name} className="absolute top-4 left-4" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ArticleMeta article={article} locale={locale} t={t} />
        <Heading className="mt-2 font-display text-2xl leading-snug font-extrabold text-balance text-brand-strong">
          <Link
            href={href(locale, articlePaths.article(article.slug))}
            className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
          >
            {article.title}
          </Link>
        </Heading>
        <p className="mt-2 line-clamp-3 flex-1 leading-relaxed text-muted">{article.excerpt}</p>
        <p aria-hidden className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-strong">
          {t.articles.readMore}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </p>
      </div>
    </article>
  );
}

/** The featured article: a wide green spread with the shop's bubbles. */
export function FeaturedArticle({ article, locale, t }: Omit<Props, 'headingLevel'>) {
  return (
    <article className="group relative grid overflow-hidden rounded-[2rem] bg-brand text-white lg:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[24rem]">
        <Image
          src={article.cover}
          alt=""
          placeholder="blur"
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="bubbles relative flex flex-col justify-center p-8 sm:p-12">
        <p className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-sun uppercase">{t.articles.featured}</span>
          <TopicChip name={article.topic.name} />
        </p>
        <h2 className="mt-5 font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl">
          <Link
            href={href(locale, articlePaths.article(article.slug))}
            className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-sun focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-sun"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-white/85">{article.excerpt}</p>
        <ArticleMeta article={article} locale={locale} t={t} className="mt-6 text-white/75" />
      </div>
    </article>
  );
}

/** A responsive grid of article cards. */
export function ArticleGrid({ articles, locale, t, headingLevel }: { articles: ArticleSummary[]; locale: Locale; t: Messages; headingLevel?: 'h2' | 'h3' }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} locale={locale} t={t} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
