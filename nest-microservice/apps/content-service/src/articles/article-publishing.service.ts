import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  addToOutbox,
  ARTICLE_EVENTS,
  ArticleResponse,
  AuthUser,
  OutboxRelay,
  PublishArticleDto,
} from '@app/common';
import { assertAllLocales } from '../common/translations';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { liveEvent, unpublishedEvent } from './article-events';
import { toArticleResponse, WITH_TRANSLATIONS } from './articles.mapper';
import { ArticlesService } from './articles.service';

/** A publish time less than this far ahead is "now", not a schedule. */
export const SCHEDULE_MIN_LEAD_MS = 60_000;

/**
 * The publishing workflow of an article (roles content:publish / content:admin, checked by
 * KrakenD and @Roles): draft → published now, draft → scheduled (ArticleSchedulerService publishes
 * it at its time), published or scheduled → draft. Going live and leaving live are events.
 */
@Injectable()
export class ArticlePublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly articles: ArticlesService,
    private readonly outbox: OutboxRelay,
  ) {}

  /**
   * Publish now (no `at`, or `at` within a minute) or schedule for `at`. Needs every language.
   * Publishing a live article again changes nothing; scheduling a live article is a conflict.
   */
  async publish(
    siteId: string,
    id: string,
    dto: PublishArticleDto,
    user: AuthUser,
    now = new Date(),
  ): Promise<ArticleResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const current = await this.articles.getOrFail(siteId, id);
    assertAllLocales(current.translations, site);
    const at = dto.at ? new Date(dto.at) : null;
    const scheduleAt = at && at.getTime() - now.getTime() >= SCHEDULE_MIN_LEAD_MS ? at : null;
    if (current.status === 'published' && scheduleAt) {
      throw new ConflictException({
        message: 'The article is already published: unpublish it first to schedule it',
        code: 'already_published',
      });
    }
    if (current.status === 'published') return toArticleResponse(current);

    const data: Prisma.ArticleUpdateManyMutationInput = scheduleAt
      ? { status: 'scheduled', scheduledAt: scheduleAt }
      : { status: 'published', publishedAt: now, scheduledAt: null };
    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.article.updateMany({
        where: { id, siteId },
        data: { ...data, updatedBy: user.id },
      });
      if (!count) return null;
      const row = await tx.article.findUniqueOrThrow({ where: { id }, include: WITH_TRANSLATIONS });
      if (row.status === 'published') {
        await addToOutbox(tx, ARTICLE_EVENTS.PUBLISHED, liveEvent(row, user.id));
      }
      return row;
    });
    if (!saved) throw new NotFoundException(`Article ${id} not found`); // deleted in between
    if (saved.status === 'published') this.outbox.poke();
    return toArticleResponse(saved);
  }

  /** Back to draft (live or scheduled). A draft stays as it is. */
  async unpublish(siteId: string, id: string, user: AuthUser): Promise<ArticleResponse> {
    await this.sites.getAccessible(siteId, user);
    const current = await this.articles.getOrFail(siteId, id);
    if (current.status === 'draft') return toArticleResponse(current);

    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.article.updateMany({
        where: { id, siteId },
        data: { status: 'draft', scheduledAt: null, publishedAt: null, updatedBy: user.id },
      });
      if (!count) return null;
      if (current.status === 'published') {
        await addToOutbox(tx, ARTICLE_EVENTS.UNPUBLISHED, unpublishedEvent(current, user.id));
      }
      return tx.article.findUniqueOrThrow({ where: { id }, include: WITH_TRANSLATIONS });
    });
    if (!saved) throw new NotFoundException(`Article ${id} not found`); // deleted in between
    if (current.status === 'published') this.outbox.poke();
    return toArticleResponse(saved);
  }
}
