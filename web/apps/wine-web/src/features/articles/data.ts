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
import { LOCALE_CODES, type Locale } from '@/i18n/locales';
import displayJars from '../../../public/images/display-jars.jpg';
import factory from '../../../public/images/factory.jpg';
import ruouCan from '../../../public/images/ruou-can.jpg';
import showroom from '../../../public/images/showroom.jpg';
import storefront from '../../../public/images/storefront.jpg';
import towerRack from '../../../public/images/tower-rack.jpg';

/**
 * Articles ("Bài viết") of Khang Hưng Tửu, from content-service (ADR 0026): what admins publish in
 * the admin site, read with this site's own service account (Keycloak client `wine-web`, ADR 0032)
 * through the shared, cached `@web/core/content/site-articles`. A failed API call THROWS (never
 * cached): the home page then shows no articles, the article pages answer an error.
 */
export const SITE_ID = 'wine';
export { ContentUnavailableError } from '@web/core/content/site-articles';

/** A topic in one language: its stable key, URL segment and name. */
export type Topic = { key: string; slug: string; name: string };

export type ArticleSummary = {
  id: string;
  slug: string;
  topic: Topic;
  publishedAt: string;
  featured: boolean;
  title: string;
  excerpt: string;
  /** The media library image the admins chose, else a photo of the winery chosen by topic. */
  cover: Cover;
  readingMinutes: number;
};

export type Article = ArticleSummary & {
  /** HTML sanitized by content-service (ADR 0031, 0033): rendered as is. */
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** This article's slug in every language (hreflang, language switch). */
  slugs: Partial<Record<Locale, string>>;
};

/** Fallback covers by topic key (the site's topics: brand, craft, serving, guide, partners). */
const COVERS: Record<string, StaticImageData> = {
  brand: storefront,
  craft: factory,
  serving: ruouCan,
  guide: displayJars,
  partners: towerRack,
};
const coverFor = (topicKey: string) => COVERS[topicKey] ?? showroom;

const isLocale = (value: string): value is Locale => (LOCALE_CODES as readonly string[]).includes(value);

function toSummary(item: PublishedArticleSummary): ArticleSummary {
  return {
    id: item.id,
    slug: item.slug,
    topic: item.category,
    publishedAt: item.publishedAt,
    featured: item.featured,
    title: item.title,
    excerpt: item.excerpt,
    cover: item.cover ? { kind: 'media', image: item.cover, alt: item.coverAlt ?? '' } : { kind: 'photo', photo: coverFor(item.category.key) },
    readingMinutes: item.readingMinutes,
  };
}

/** The site's topics in one language, in the admins' order. With every language's slug. */
export async function listTopics(locale: Locale): Promise<(Topic & { slugs: Partial<Record<Locale, string>> })[]> {
  return listSiteTopics(SITE_ID, locale, LOCALE_CODES);
}

export async function topicBySlug(locale: Locale, slug: string) {
  return (await listTopics(locale)).find((topic) => topic.slug === slug);
}

/** Every published article in a language, newest first (optionally one topic, by its slug). */
export async function listArticles(locale: Locale, topicSlug?: string): Promise<ArticleSummary[]> {
  return (await listSiteArticles(SITE_ID, locale, topicSlug)).map(toSummary);
}

/** The newest articles, or none when the API can't be reached (the home page still renders). */
export async function latestArticles(locale: Locale, count: number): Promise<ArticleSummary[]> {
  return listArticles(locale).then(
    (articles) => articles.slice(0, count),
    () => [],
  );
}

/**
 * One article by its slug in `locale`, or null. An OLD slug finds it too: compare `article.slug`
 * with the slug asked and redirect when they differ.
 */
export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  const item = await getSiteArticle(SITE_ID, locale, slug);
  if (!item) return null;
  return {
    ...toSummary(item),
    body: item.body,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    slugs: Object.fromEntries(item.alternates.filter((a) => isLocale(a.locale)).map((a) => [a.locale, a.slug])),
  };
}

/** A slug of ANOTHER language: the same article's slug in `locale` (to redirect to), or null. */
export function slugInLocale(locale: Locale, slug: string): Promise<string | null> {
  return articleSlugInLocale(SITE_ID, LOCALE_CODES, locale, slug);
}

/** Same for a topic: a segment of another language → this language's segment. */
export function topicSlugInLocale(locale: Locale, segment: string): Promise<string | null> {
  return siteTopicSlugInLocale(SITE_ID, LOCALE_CODES, locale, segment);
}

/** "/bai-viet", "/bai-viet/<slug>", "/bai-viet/chu-de/<topic slug>" (pass through href(locale, …)). */
export const articlePaths = {
  index: '/bai-viet',
  article: (slug: string) => `/bai-viet/${slug}`,
  topic: (slug: string) => `/bai-viet/chu-de/${slug}`,
};
