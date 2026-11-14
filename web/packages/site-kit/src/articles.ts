import 'server-only';
import type { StaticImageData } from 'next/image';
import type { PublishedArticleSummary } from '@web/core/api';
import {
  articleSlugInLocale,
  getSiteArticle,
  listSiteArticles,
  listSiteTopics,
  topicSlugInLocale as siteTopicSlugInLocale,
} from '@web/core/content/site-articles';
import type { Cover } from '@web/ui/cover-image';
import type { Locale } from './locales';
import type { Website } from './website';

export { ContentUnavailableError } from '@web/core/content/site-articles';

/** A topic in one language: its stable key, URL segment and name. */
export type Topic = { key: string; slug: string; name: string };
export type TopicWithSlugs = Topic & { slugs: Partial<Record<Locale, string>> };

export type ArticleSummary = {
  id: string;
  slug: string;
  topic: Topic;
  publishedAt: string;
  featured: boolean;
  title: string;
  excerpt: string;
  /** The media library image the admins chose, else one of the site's photos, by topic. */
  cover: Cover;
  readingMinutes: number;
};

export type Article = ArticleSummary & {
  /** HTML sanitized by content-service (ADR 0031): rendered as is. */
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** This article's slug in every language (hreflang, language switch). */
  slugs: Partial<Record<Locale, string>>;
};

export interface ArticleCovers {
  /** A site photo for an article without a library cover. */
  fallback: StaticImageData;
  /** Optional photo per topic key. */
  byTopic?: Record<string, StaticImageData>;
}

/**
 * The articles of ONE site from content-service (ADR 0026): what admins publish in the admin
 * site, read with this site's own service account (ADR 0032) through the shared, cached
 * `@web/core/content/site-articles`. A failed API call THROWS (never cached).
 */
export function createArticles(website: Website, covers: ArticleCovers) {
  const siteId = website.business.siteId;
  const locales = [...website.locales];
  const isLocale = (value: string): value is Locale => (locales as string[]).includes(value);
  const coverFor = (topicKey: string) => covers.byTopic?.[topicKey] ?? covers.fallback;

  const toSummary = (item: PublishedArticleSummary): ArticleSummary => ({
    id: item.id,
    slug: item.slug,
    topic: item.category,
    publishedAt: item.publishedAt,
    featured: item.featured,
    title: item.title,
    excerpt: item.excerpt,
    cover: item.cover ? { kind: 'media', image: item.cover, alt: item.coverAlt ?? '' } : { kind: 'photo', photo: coverFor(item.category.key) },
    readingMinutes: item.readingMinutes,
  });

  async function listTopics(locale: Locale): Promise<TopicWithSlugs[]> {
    return (await listSiteTopics(siteId, locale, locales)) as TopicWithSlugs[];
  }

  return {
    siteId,
    listTopics,
    async topicBySlug(locale: Locale, slug: string) {
      return (await listTopics(locale)).find((topic) => topic.slug === slug);
    },
    /** Every published article in a language, newest first (optionally one topic, by its slug). */
    async listArticles(locale: Locale, topicSlug?: string): Promise<ArticleSummary[]> {
      return (await listSiteArticles(siteId, locale, topicSlug)).map(toSummary);
    },
    /** One article by its slug in `locale`, or null. An OLD slug finds it too (compare and redirect). */
    async getArticle(locale: Locale, slug: string): Promise<Article | null> {
      const item = await getSiteArticle(siteId, locale, slug);
      if (!item) return null;
      return {
        ...toSummary(item),
        body: item.body,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        slugs: Object.fromEntries(item.alternates.filter((a) => isLocale(a.locale)).map((a) => [a.locale, a.slug])),
      };
    },
    /** A slug of ANOTHER language: the same article's slug in `locale` (to redirect to), or null. */
    slugInLocale(locale: Locale, slug: string): Promise<string | null> {
      return articleSlugInLocale(siteId, locales, locale, slug);
    },
    /** Same for a topic segment. */
    topicSlugInLocale(locale: Locale, segment: string): Promise<string | null> {
      return siteTopicSlugInLocale(siteId, locales, locale, segment);
    },
  };
}

export type SiteArticles = ReturnType<typeof createArticles>;
