import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  addToOutbox,
  AuthUser,
  AutoTranslateArticleDto,
  OutboxRelay,
  TRANSLATION_EVENTS,
  TRANSLATION_MAX_SEGMENT_LENGTH,
  TRANSLATION_MAX_SEGMENTS,
  TranslationCompletedEvent,
  TranslationFailedEvent,
  TranslationJobResponse,
  TranslationJobStatus,
  TranslationRequestedEvent,
  TranslationWarning,
} from '@app/common';
import { toArticleHtml } from '../articles/article-html';
import { toTranslationRow } from '../articles/articles.mapper';
import { ArticlesService } from '../articles/articles.service';
import type { Prisma, TranslationJob } from '../generated/prisma/client';
import { REQUESTER } from '../common/ai';
import { MediaUrls } from '../media/media-urls';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { applySegments, planSegments, reviewWarnings, type SourceFields } from './article-segments';
import { freeSlug, slugify } from './slug';

type Tx = Prisma.TransactionClient;

/** A pending job younger than this is reused instead of asking again (double clicks). */
const PENDING_REUSE_MS = 15 * 60_000;

/**
 * Machine translation of articles (ADR 0036). `start` checks the request, stores the job with a
 * snapshot of the source language and asks ai-service through the outbox (same transaction).
 * The result comes back as an event (AiResultsConsumer → `complete` / `fail`, inside
 * the inbox transaction): the translation is put back into the snapshot's structure, sanitized
 * like any body, and saved as a DRAFT translation for a person to review. Rules:
 *  - only DRAFT articles: machine text never reaches a live article unreviewed (409 not_a_draft);
 *  - an existing target language is replaced only with `overwrite` (409 translation_exists).
 */
@Injectable()
export class TranslationJobsService {
  private readonly logger = new Logger(TranslationJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly articles: ArticlesService,
    private readonly urls: MediaUrls,
    private readonly outbox: OutboxRelay,
  ) {}

  async start(
    siteId: string,
    articleId: string,
    targetLocale: string,
    dto: AutoTranslateArticleDto,
    user: AuthUser,
  ): Promise<TranslationJobResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const { sourceLocale } = dto;
    if (
      sourceLocale === targetLocale ||
      !site.locales.includes(sourceLocale) ||
      !site.locales.includes(targetLocale)
    ) {
      throw new UnprocessableEntityException({
        message: `Translate between two different languages of the site (${site.locales.join(', ')})`,
        code: 'invalid_locale',
      });
    }
    const article = await this.articles.getOrFail(siteId, articleId);
    if (article.status !== 'draft') {
      throw new ConflictException({
        message: 'Only a draft can be machine-translated: unpublish it first',
        code: 'not_a_draft',
      });
    }
    const source = article.translations.find((t) => t.locale === sourceLocale);
    if (!source) {
      throw new UnprocessableEntityException({
        message: `The article has no ${sourceLocale} text to translate`,
        code: 'missing_source',
      });
    }
    if (!dto.overwrite && article.translations.some((t) => t.locale === targetLocale)) {
      throw new ConflictException({
        message: `The article already has ${targetLocale}: send overwrite to replace it`,
        code: 'translation_exists',
      });
    }

    const recent = await this.prisma.translationJob.findFirst({
      where: {
        siteId,
        articleId,
        targetLocale,
        status: 'pending',
        createdAt: { gt: new Date(Date.now() - PENDING_REUSE_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return toJobResponse(recent);

    const snapshot: SourceFields = {
      title: source.title,
      excerpt: source.excerpt,
      coverAlt: source.coverAlt,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      body: source.body,
    };
    const { segments } = planSegments(snapshot);
    if (
      segments.length > TRANSLATION_MAX_SEGMENTS ||
      segments.some((s) => s.length > TRANSLATION_MAX_SEGMENT_LENGTH)
    ) {
      throw new UnprocessableEntityException({
        message: 'The article is too long to translate in one go',
        code: 'too_large',
      });
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.translationJob.create({
        data: {
          siteId,
          articleId,
          sourceLocale,
          targetLocale,
          overwrite: dto.overwrite ?? false,
          source: snapshot,
          createdBy: user.id,
        },
      });
      const event: TranslationRequestedEvent = {
        jobId: created.id,
        requester: REQUESTER,
        siteId,
        sourceLocale,
        targetLocale,
        kind: 'article',
        segments,
        // The site's name is a brand: never translated.
        glossary: [{ source: site.name, target: site.name }],
        actorId: user.id,
      };
      await addToOutbox(tx, TRANSLATION_EVENTS.REQUESTED, event);
      return created;
    });
    this.outbox.poke();
    return toJobResponse(job);
  }

  async findForArticle(
    siteId: string,
    articleId: string,
    user: AuthUser,
  ): Promise<TranslationJobResponse[]> {
    await this.sites.getAccessible(siteId, user);
    const rows = await this.prisma.translationJob.findMany({
      where: { siteId, articleId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 10,
    });
    return rows.map(toJobResponse);
  }

  async findOne(
    siteId: string,
    articleId: string,
    id: string,
    user: AuthUser,
  ): Promise<TranslationJobResponse> {
    await this.sites.getAccessible(siteId, user);
    const job = await this.prisma.translationJob.findFirst({ where: { id, siteId, articleId } });
    if (!job) throw new NotFoundException(`Translation job ${id} not found`);
    return toJobResponse(job);
  }

  /** ai-service's answer, inside the inbox transaction. */
  async complete(tx: Tx, event: TranslationCompletedEvent): Promise<void> {
    const job = await this.pendingJob(tx, event.jobId, event.siteId);
    if (!job) return;
    const article = await tx.article.findFirst({
      where: { id: job.articleId, siteId: job.siteId },
      include: { translations: true },
    });
    if (!article || article.status !== 'draft') {
      return this.finish(tx, job, 'failed', { error: 'article_not_draft' });
    }
    const existing = article.translations.find((t) => t.locale === job.targetLocale);
    if (existing && !job.overwrite) {
      return this.finish(tx, job, 'failed', { error: 'translation_exists' });
    }

    const source = job.source as unknown as SourceFields;
    const plan = planSegments(source);
    let body: string;
    let fields: ReturnType<typeof applySegments>['fields'];
    try {
      const applied = applySegments(source, plan, event.segments);
      fields = applied.fields;
      body = toArticleHtml(job.targetLocale, applied.body, this.urls.sitePrefix(job.siteId));
    } catch (error) {
      return this.finish(tx, job, 'failed', {
        error: 'invalid_output',
        detail: error instanceof Error ? error.message.slice(0, 300) : undefined,
      });
    }

    const title = fields.title || source.title || '';
    const slug = await freeSlug(slugify(title), async (candidate) => {
      const taken = await tx.articleTranslation.findUnique({
        where: {
          siteId_locale_slug: { siteId: job.siteId, locale: job.targetLocale, slug: candidate },
        },
        select: { articleId: true },
      });
      return !!taken && taken.articleId !== job.articleId;
    });

    await tx.articleTranslation.deleteMany({
      where: { articleId: job.articleId, locale: job.targetLocale },
    });
    await tx.articleTranslation.createMany({
      data: [
        toTranslationRow(job.siteId, job.articleId, {
          locale: job.targetLocale,
          title,
          slug,
          excerpt: fields.excerpt || source.excerpt || '',
          coverAlt: fields.coverAlt ?? null,
          body,
          seoTitle: fields.seoTitle ?? null,
          seoDescription: fields.seoDescription ?? null,
        }),
      ],
    });
    // A slug taken back from a redirect now belongs to this article (as in ArticlesService).
    await tx.articleSlugRedirect.deleteMany({
      where: { siteId: job.siteId, locale: job.targetLocale, slug },
    });
    // The article changed: editors reload it (updatedAt), and who asked is its last editor.
    await tx.article.update({ where: { id: job.articleId }, data: { updatedBy: job.createdBy } });

    const warnings: TranslationWarning[] = reviewWarnings(plan.segments, event.segments).map(
      (w) => ({
        kind: w.kind,
        text: event.segments[w.index].replace(/<[^>]*>/g, '').slice(0, 80),
      }),
    );
    await this.finish(tx, job, 'completed', {
      warnings,
      provider: event.provider,
      model: event.model,
    });
    this.logger.log(
      `job ${job.id}: ${job.sourceLocale}→${job.targetLocale} saved on article ${job.articleId} (${warnings.length} to review)`,
    );
  }

  /** ai-service gave up, inside the inbox transaction. */
  async fail(tx: Tx, event: TranslationFailedEvent): Promise<void> {
    const job = await this.pendingJob(tx, event.jobId, event.siteId);
    if (job) await this.finish(tx, job, 'failed', { error: event.reason, detail: event.detail });
  }

  private pendingJob(tx: Tx, id: string, siteId: string): Promise<TranslationJob | null> {
    // A job of another site, or already finished (a late duplicate), is left alone.
    return tx.translationJob.findFirst({ where: { id, siteId, status: 'pending' } });
  }

  private async finish(
    tx: Tx,
    job: TranslationJob,
    status: Exclude<TranslationJobStatus, 'pending'>,
    data: {
      error?: string;
      detail?: string;
      warnings?: TranslationWarning[];
      provider?: string;
      model?: string;
    },
  ): Promise<void> {
    await tx.translationJob.update({
      where: { id: job.id },
      data: {
        status,
        error: data.error ?? null,
        detail: data.detail?.slice(0, 300) ?? null,
        warnings: data.warnings ? (data.warnings as unknown as Prisma.InputJsonArray) : undefined,
        provider: data.provider ?? null,
        model: data.model ?? null,
        completedAt: new Date(),
      },
    });
  }
}

export function toJobResponse(row: TranslationJob): TranslationJobResponse {
  return {
    id: row.id,
    siteId: row.siteId,
    articleId: row.articleId,
    sourceLocale: row.sourceLocale,
    targetLocale: row.targetLocale,
    status: row.status as TranslationJobStatus,
    error: row.error,
    detail: row.detail,
    warnings: (row.warnings as unknown as TranslationWarning[] | null) ?? [],
    provider: row.provider,
    model: row.model,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
