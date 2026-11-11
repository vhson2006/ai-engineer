import {
  ArticleEventTranslation,
  ArticlePublishedEvent,
  ArticleUnpublishedEvent,
  ArticleUpdatedEvent,
} from '@app/common';
import type { Article, ArticleTranslation } from '../generated/prisma/client';
import type { ArticleRow } from './articles.mapper';

/**
 * Payloads of the article events (ARTICLE_EVENTS in libs/common), written to the outbox in the
 * transaction of the change by ArticlesService, ArticlePublishingService and the scheduler.
 */

/** PUBLISHED / UPDATED: the article is live; every language with its link and preview text. */
export function liveEvent(
  row: ArticleRow,
  actorId: string,
): ArticlePublishedEvent & ArticleUpdatedEvent {
  return {
    id: row.id,
    siteId: row.siteId,
    translations: eventTranslations(row.translations),
    publishedAt: (row.publishedAt ?? new Date()).toISOString(),
    actorId,
    occurredAt: new Date().toISOString(),
  };
}

/** UNPUBLISHED: the article left the site (unpublished or deleted). */
export function unpublishedEvent(row: Article, actorId: string): ArticleUnpublishedEvent {
  return { id: row.id, siteId: row.siteId, actorId, occurredAt: new Date().toISOString() };
}

function eventTranslations(rows: ArticleTranslation[]): ArticleEventTranslation[] {
  return [...rows]
    .sort((a, b) => a.locale.localeCompare(b.locale))
    .map((t) => ({ locale: t.locale, slug: t.slug, title: t.title, excerpt: t.excerpt }));
}
