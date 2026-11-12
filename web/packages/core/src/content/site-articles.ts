import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import {
  getPublishedArticle,
  listPublishedArticles,
  listSiteCategories,
  type ApiResult,
  type PublishedArticle,
  type PublishedArticleSummary,
} from '../api';

/**
 * The published articles of ONE public site (laundry, nails…), read by that site's server with its
 * own service account (siteApiFetch, ADR 0032). Each app maps them to its own types (covers,
 * paths) in `src/features/articles/data.ts`.
 *
 * Cached ('use cache', a few minutes, tag `content:<siteId>`): the pages stay static and fast, a new
 * or changed article shows up within minutes. A failed API call THROWS (never cached): the next
 * request tries again.
 */

const PAGE_SIZE = 100; // the API's maximum: every article of the site in one call

export class ContentUnavailableError extends Error {
  constructor(result: Extract<ApiResult<unknown>, { ok: false }>) {
    super(`content API: ${result.status} ${result.code} [requestId=${result.requestId}]`);
  }
}

/** A topic in one language (stable key, URL segment, name), with its segment in every language. */
export type SiteTopic = { key: string; slug: string; name: string; slugs: Record<string, string> };

/** The site's topics in one language, in the admins' order. `locales`: the site's languages. */
export async function listSiteTopics(siteId: string, locale: string, locales: readonly string[]): Promise<SiteTopic[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`content:${siteId}`);
  const result = await listSiteCategories(siteId);
  if (!result.ok) throw new ContentUnavailableError(result);
  return [...result.data]
    .sort((a, b) => a.position - b.position || a.key.localeCompare(b.key))
    .flatMap((category) => {
      const own = category.translations.find((t) => t.locale === locale);
      if (!own) return [];
      const slugs = Object.fromEntries(category.translations.filter((t) => locales.includes(t.locale)).map((t) => [t.locale, t.slug]));
      return [{ key: category.key, slug: own.slug, name: own.name, slugs }];
    });
}

/** Every published article in a language, newest first (optionally one topic, by its slug). */
export async function listSiteArticles(siteId: string, locale: string, topicSlug?: string): Promise<PublishedArticleSummary[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`content:${siteId}`);
  const result = await listPublishedArticles(siteId, { locale, category: topicSlug, limit: PAGE_SIZE });
  if (!result.ok) {
    if (result.status === 404) return []; // an unknown topic
    throw new ContentUnavailableError(result);
  }
  return result.data.data;
}

/**
 * One article by its slug in `locale`, or null. An OLD slug finds it too: compare its `slug` with
 * the slug asked and redirect (308) when they differ.
 */
export async function getSiteArticle(siteId: string, locale: string, slug: string): Promise<PublishedArticle | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`content:${siteId}`);
  const result = await getPublishedArticle(siteId, locale, slug);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) return null; // unknown, or not a valid slug
    throw new ContentUnavailableError(result);
  }
  return result.data;
}

/**
 * A slug of ANOTHER language (the language switcher keeps the path; a link shared in the other
 * language): the same article's slug in `locale`, to redirect to. Null when no language has it.
 */
export async function articleSlugInLocale(siteId: string, locales: readonly string[], locale: string, slug: string): Promise<string | null> {
  for (const other of locales) {
    if (other === locale) continue;
    const article = await getSiteArticle(siteId, other, slug);
    const own = article?.alternates.find((alternate) => alternate.locale === locale)?.slug;
    if (own) return own;
  }
  return null;
}

/** Same for a topic: a segment of another language → this language's segment. */
export async function topicSlugInLocale(siteId: string, locales: readonly string[], locale: string, segment: string): Promise<string | null> {
  const topic = (await listSiteTopics(siteId, locale, locales)).find((t) => Object.values(t.slugs).includes(segment));
  return topic?.slug ?? null;
}
