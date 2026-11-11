import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addToOutbox, ARTICLE_EVENTS, OutboxRelay } from '@app/common';
import { PrismaService } from '../prisma/prisma.service';
import { liveEvent } from './article-events';
import { WITH_TRANSLATIONS } from './articles.mapper';

/** Articles published per run; the next run (a minute later) takes the rest. */
export const SCHEDULER_BATCH = 50;

/**
 * Scheduled publishing: every minute, articles whose `scheduled_at` has come go live, with
 * `published_at` = the scheduled time and a PUBLISHED event (outbox, same transaction).
 *
 * Safe with several replicas: the due rows are locked with FOR UPDATE SKIP LOCKED, so each one is
 * published by exactly one replica. An article that lost a language since it was scheduled (the
 * site gained a language) goes back to draft instead of going live incomplete.
 */
@Injectable()
export class ArticleSchedulerService {
  private readonly logger = new Logger(ArticleSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'publish-scheduled-articles' })
  async run(): Promise<void> {
    try {
      const { published, reverted } = await this.publishDue();
      if (published || reverted) {
        this.logger.log(`Scheduled articles: ${published} published, ${reverted} back to draft`);
      }
    } catch (error) {
      // Never crash the process from a background job; the next run retries.
      this.logger.error(
        'Publishing scheduled articles failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async publishDue(now = new Date()): Promise<{ published: number; reverted: number }> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const due = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM articles
          WHERE status = 'scheduled' AND scheduled_at <= ${now}
          ORDER BY scheduled_at, id
          LIMIT ${SCHEDULER_BATCH}
          FOR UPDATE SKIP LOCKED`;
        let published = 0;
        let reverted = 0;
        for (const { id } of due) {
          const article = await tx.article.findUniqueOrThrow({
            where: { id },
            include: { ...WITH_TRANSLATIONS, site: true },
          });
          const present = new Set(article.translations.map((t) => t.locale));
          const complete = article.site.locales.every((locale) => present.has(locale));
          if (!complete) {
            await tx.article.update({
              where: { id },
              data: { status: 'draft', scheduledAt: null },
            });
            this.logger.warn(`Scheduled article ${id} misses a language: back to draft`);
            reverted++;
            continue;
          }
          const row = await tx.article.update({
            where: { id },
            data: {
              status: 'published',
              publishedAt: article.scheduledAt ?? now,
              scheduledAt: null,
            },
            include: WITH_TRANSLATIONS,
          });
          // The actor is whoever last changed it, i.e. who scheduled it.
          await addToOutbox(tx, ARTICLE_EVENTS.PUBLISHED, liveEvent(row, row.updatedBy));
          published++;
        }
        return { published, reverted };
      },
      { timeout: 30_000 },
    );
    if (result.published) this.outbox.poke();
    return result;
  }
}
