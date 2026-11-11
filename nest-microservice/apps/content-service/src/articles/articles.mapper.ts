import {
  ArticleResponse,
  ArticleStatus,
  ArticleTranslationDto,
  ArticleTranslationResponse,
} from '@app/common';
import type { Article, ArticleTranslation, Prisma } from '../generated/prisma/client';
import { htmlText } from './article-html';

/** Prisma rows → response contracts (never return a raw row), and validated input → rows. */

export const WITH_TRANSLATIONS = { translations: true } as const;
export type ArticleRow = Article & { translations: ArticleTranslation[] };

export const WORDS_PER_MINUTE = 200;

export function toTranslationResponse(row: ArticleTranslation): ArticleTranslationResponse {
  return {
    locale: row.locale,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverAlt: row.coverAlt,
    body: row.body,
    readingMinutes: row.readingMinutes,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

export function toArticleResponse(row: ArticleRow): ArticleResponse {
  return {
    id: row.id,
    siteId: row.siteId,
    categoryId: row.categoryId,
    status: row.status as ArticleStatus, // varchar + CHECK constraint, values from the service
    featured: row.featured,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    translations: [...row.translations]
      .sort((a, b) => a.locale.localeCompare(b.locale))
      .map(toTranslationResponse),
  };
}

/** Title, excerpt and the text of the (sanitized) body, at 200 words a minute, at least 1. */
export function readingMinutes(title: string, excerpt: string, html: string): number {
  const words = [title, excerpt, htmlText(html)]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function toTranslationRow(
  siteId: string,
  articleId: string,
  t: ArticleTranslationDto,
): Prisma.ArticleTranslationCreateManyInput {
  return {
    articleId,
    siteId,
    locale: t.locale,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt,
    coverAlt: t.coverAlt ?? null,
    body: t.body, // already sanitized: withCleanBodies (article-html.ts)
    readingMinutes: readingMinutes(t.title, t.excerpt, t.body),
    seoTitle: t.seoTitle ?? null,
    seoDescription: t.seoDescription ?? null,
  };
}
