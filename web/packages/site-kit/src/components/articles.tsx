import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, cn } from '@web/ui';
import { CoverImage } from '@web/ui/cover-image';
import { withYouTubeFacades } from '@web/ui/youtube';
import { YouTubeEmbeds } from '@web/ui/youtube-embeds';
import type { ArticleSummary, Topic } from '../articles';
import { href, type Locale } from '../locales';
import type { BaseMessages } from '../messages';
import type { Website } from '../website';
import { Eyebrow } from './section';

type Props = { article: ArticleSummary; website: Website; locale: Locale; t: BaseMessages; headingLevel?: 'h2' | 'h3' };

/** Date · reading time. */
export function ArticleMeta({ article, website, locale, t, className }: Omit<Props, 'headingLevel'> & { className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted', className)}>
      <time dateTime={article.publishedAt}>{website.instantDate(locale, article.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="size-3.5" />
        {format(t.articles.minutes, { count: article.readingMinutes })}
      </span>
    </p>
  );
}

/** The topic as a small label in the accent colour (`.topic-chip`: a site may restyle it). */
export function TopicChip({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('topic-chip inline-flex rounded-button bg-accent px-3 py-1 text-xs font-bold tracking-wide text-accent-fg uppercase', className)}>
      {name}
    </span>
  );
}

/**
 * An article in a list: cover, topic, title, excerpt, meta. The whole card is clickable through
 * the title link (stretched with ::after): one link per card for screen readers.
 */
export function ArticleCard({ article, website, locale, t, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow duration-300 hover:shadow-xl hover:shadow-brand/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <CoverImage
          cover={article.cover}
          decorative
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <TopicChip name={article.topic.name} className="absolute top-4 left-4" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ArticleMeta article={article} website={website} locale={locale} t={t} />
        <Heading className="display mt-2 text-2xl leading-snug text-balance text-brand-strong">
          <Link
            href={href(locale, website.paths.article(article.slug))}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
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

/** The featured article: a wide spread on the deep band. */
export function FeaturedArticle({ article, website, locale, t }: Omit<Props, 'headingLevel'>) {
  return (
    <article className="group relative grid overflow-hidden rounded-card bg-deep text-deep-fg lg:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[24rem]">
        <CoverImage
          cover={article.cover}
          decorative
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="relative flex flex-col justify-center p-8 sm:p-12">
        <p className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-accent uppercase">{t.articles.featured}</span>
          <TopicChip name={article.topic.name} />
        </p>
        <h2 className="display mt-5 text-3xl leading-tight text-balance sm:text-4xl">
          <Link
            href={href(locale, website.paths.article(article.slug))}
            className="after:absolute after:inset-0 group-hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-accent"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-deep-fg/85">{article.excerpt}</p>
        <ArticleMeta article={article} website={website} locale={locale} t={t} className="mt-6 text-deep-fg/75" />
      </div>
    </article>
  );
}

/** A responsive grid of article cards. */
export function ArticleGrid({
  articles,
  website,
  locale,
  t,
  headingLevel,
}: {
  articles: ArticleSummary[];
  website: Website;
  locale: Locale;
  t: BaseMessages;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} website={website} locale={locale} t={t} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

/**
 * An article's body: HTML from content-service, sanitized there with an allow-list on every write
 * (ADR 0031 text + ADR 0033 layout blocks). Rendered as is, ONLY for HTML from that API; text by
 * `.article-body` (site-kit theme.css), blocks by @web/ui/article-layout.css. YouTube blocks get
 * their player here (ADR 0040).
 */
export function ArticleBody({ html, playLabel }: { html: string; playLabel: string }) {
  return (
    <>
      <div className="article-body article-layout" dangerouslySetInnerHTML={{ __html: withYouTubeFacades(html, playLabel) }} />
      <YouTubeEmbeds />
    </>
  );
}

/** Masthead of the article list pages: label, the page's <h1>, intro and the topics (real links). */
export function ArticlesHeader({
  title,
  intro,
  active,
  topics,
  website,
  locale,
  t,
}: {
  title: string;
  intro: string;
  active?: string;
  topics: Topic[];
  website: Website;
  locale: Locale;
  t: BaseMessages;
}) {
  const links = [
    { id: 'all', label: t.articles.all, path: website.paths.articles, current: !active },
    ...topics.map((topic) => ({ id: topic.key, label: topic.name, path: website.paths.topic(topic.slug), current: active === topic.key })),
  ];
  return (
    <div className="border-b border-border bg-surface-2">
      <Container className="pt-14 pb-10 sm:pt-20">
        <Eyebrow>{t.articles.eyebrow}</Eyebrow>
        <h1 className="display mt-4 max-w-3xl text-5xl leading-[1.05] text-balance text-brand-strong sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
        <nav aria-label={t.articles.categoriesLabel} className="mt-10">
          <ul className="flex flex-wrap gap-2">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  href={href(locale, link.path)}
                  aria-current={link.current ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 items-center rounded-button border px-5 text-sm font-semibold transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    link.current ? 'border-brand bg-brand text-brand-fg' : 'border-border bg-surface hover:border-brand hover:text-brand-strong',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </div>
  );
}

/**
 * "New articles" on a landing page: the three newest, or nothing at all when there are none yet
 * or the API is down (the page never fails because of the articles).
 */
export function LatestArticles({
  articles,
  website,
  locale,
  t,
  id = 'articles',
}: {
  articles: ArticleSummary[];
  website: Website;
  locale: Locale;
  t: BaseMessages;
  id?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>{t.articles.eyebrow}</Eyebrow>
            <h2 id={`${id}-title`} className="display mt-4 text-4xl leading-[1.1] text-balance text-brand-strong sm:text-5xl">
              {t.articles.latest}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{t.blog.latestIntro}</p>
          </div>
          <Link href={href(locale, website.paths.articles)} className="inline-flex items-center gap-1.5 font-bold text-brand-strong hover:underline">
            {t.articles.viewAll}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="mt-10">
          <ArticleGrid articles={articles.slice(0, 3)} website={website} locale={locale} t={t} />
        </div>
      </Container>
    </section>
  );
}

