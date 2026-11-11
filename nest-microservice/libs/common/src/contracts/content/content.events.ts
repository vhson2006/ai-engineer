import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * Article events (stream EVENTS, ADR 0007/0024), written to content-service's outbox in the
 * transaction of the change. Consumers: social-service (post to fanpages, ADR 0026), later the
 * sites' cache revalidation. Evolve backward-compatibly: add optional fields only.
 */
export const ARTICLE_EVENTS = {
  /** Went live: published now, or its scheduled time came. */
  PUBLISHED: 'events.article.published',
  /** A live article changed (text, slug, category, featured). */
  UPDATED: 'events.article.updated',
  /** No longer live: unpublished or deleted. */
  UNPUBLISHED: 'events.article.unpublished',
} as const;

/** One language of the article: enough for a consumer to build the link and a preview. */
export class ArticleEventTranslation {
  @IsString()
  locale: string;

  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  excerpt: string;
}

export class ArticleLiveEvent {
  @IsUUID()
  id: string;

  @IsString()
  siteId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ArticleEventTranslation)
  translations: ArticleEventTranslation[];

  @IsISO8601()
  publishedAt: string;

  /** Keycloak `sub` of whoever caused it (for a scheduled publish: who scheduled it). */
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsISO8601()
  occurredAt: string;
}

/** Payload of ARTICLE_EVENTS.PUBLISHED. */
export class ArticlePublishedEvent extends ArticleLiveEvent {}

/** Payload of ARTICLE_EVENTS.UPDATED. */
export class ArticleUpdatedEvent extends ArticleLiveEvent {}

/** Payload of ARTICLE_EVENTS.UNPUBLISHED. */
export class ArticleUnpublishedEvent {
  @IsUUID()
  id: string;

  @IsString()
  siteId: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsISO8601()
  occurredAt: string;
}
