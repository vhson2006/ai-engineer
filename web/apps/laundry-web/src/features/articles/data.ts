import 'server-only';
import type { StaticImageData } from 'next/image';
import { cacheLife, cacheTag } from 'next/cache';
import {
  getPublishedArticle,
  listPublishedArticles,
  listSiteCategories,
  type ApiResult,
  type MediaImage,
  type PublishedArticleSummary,
} from '@web/core/api';
import { LOCALE_CODES, type Locale } from '@/i18n/locales';
import machines from '../../../public/images/machines.jpg';
import shelves from '../../../public/images/shelves.jpg';
import coverShop from '../../../public/images/cover-shop.jpg';

/**
 * Articles ("Bài viết") of SFaster, from content-service (ADR 0026): what admins publish in the
 * admin site, read with this site's own service account (siteApiFetch, ADR 0032).
 *
 * Cached ('use cache', a few minutes): the pages stay static and fast, a new or changed article
 * shows up within minutes. A failed API call THROWS (never cached): the next request tries again.
 */
export const SITE_ID = 'laundry';
const CACHE_TAG = `content:${SITE_ID}`;
const PAGE_SIZE = 100; // the API's maximum: every article of the site in one call

/**
 * An article's cover: the image the admins chose in the media library (ADR 0034: optimized
 * sizes on the CDN, alt text per language), or a photo of the shop chosen by topic.
 */
export type Cover = { kind: 'media'; image: MediaImage; alt: string } | { kind: 'photo'; photo: StaticImageData };

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

const COVERS: Record<string, StaticImageData> = { tips: shelves, services: machines, shop: coverShop };
const coverFor = (topicKey: string) => COVERS[topicKey] ?? coverShop;

export class ContentUnavailableError extends Error {
  constructor(result: Extract<ApiResult<unknown>, { ok: false }>) {
    super(`content API: ${result.status} ${result.code} [requestId=${result.requestId}]`);
  }
}

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
  'use cache';
  cacheLife('minutes');
  cacheTag(CACHE_TAG);
  const result = await listSiteCategories(SITE_ID);
  if (!result.ok) throw new ContentUnavailableError(result);
  return [...result.data]
    .sort((a, b) => a.position - b.position || a.key.localeCompare(b.key))
    .flatMap((category) => {
      const own = category.translations.find((t) => t.locale === locale);
      if (!own) return [];
      const slugs = Object.fromEntries(category.translations.filter((t) => isLocale(t.locale)).map((t) => [t.locale, t.slug]));
      return [{ key: category.key, slug: own.slug, name: own.name, slugs }];
    });
}

export async function topicBySlug(locale: Locale, slug: string) {
  return (await listTopics(locale)).find((topic) => topic.slug === slug);
}

/** Every published article in a language, newest first (optionally one topic, by its slug). */
export async function listArticles(locale: Locale, topicSlug?: string): Promise<ArticleSummary[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(CACHE_TAG);
  const result = await listPublishedArticles(SITE_ID, { locale, category: topicSlug, limit: PAGE_SIZE });
  if (!result.ok) {
    if (result.status === 404) return []; // an unknown topic
    throw new ContentUnavailableError(result);
  }
  return result.data.data.map(toSummary);
}

/**
 * One article by its slug in `locale`, or null. An OLD slug finds it too: compare `article.slug`
 * with the slug asked and redirect (301) when they differ.
 */
export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(CACHE_TAG);
  const result = await getPublishedArticle(SITE_ID, locale, slug);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) return null; // unknown, or not a valid slug
    throw new ContentUnavailableError(result);
  }
  const item = result.data;
  return {
    ...toSummary(item),
    body: item.body,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    slugs: Object.fromEntries(item.alternates.filter((a) => isLocale(a.locale)).map((a) => [a.locale, a.slug])),
  };
}

/**
 * A slug of ANOTHER language (the language switcher keeps the path; a link shared in the other
 * language): the same article's slug in `locale`, to redirect to. Null when no language has it.
 */
export async function slugInLocale(locale: Locale, slug: string): Promise<string | null> {
  for (const other of LOCALE_CODES) {
    if (other === locale) continue;
    const article = await getArticle(other, slug);
    const own = article?.slugs[locale];
    if (own) return own;
  }
  return null;
}

/** Same for a topic: a segment of another language → this language's segment. */
export async function topicSlugInLocale(locale: Locale, segment: string): Promise<string | null> {
  const topic = (await listTopics(locale)).find((t) => Object.values(t.slugs).includes(segment));
  return topic?.slug ?? null;
}

/** "/bai-viet", "/bai-viet/<slug>", "/bai-viet/chu-de/<topic slug>" (pass through href(locale, …)). */
export const articlePaths = {
  index: '/bai-viet',
  article: (slug: string) => `/bai-viet/${slug}`,
  topic: (slug: string) => `/bai-viet/chu-de/${slug}`,
};
