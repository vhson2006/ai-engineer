import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  addToOutbox,
  ARTICLE_PROMPT_EVENTS,
  ARTICLE_WRITING_EVENTS,
  AuthUser,
  type ArticleTranslationDto,
  CreateArticleDraftDto,
  OutboxRelay,
  WriteArticleDraftDto,
  type ArticleDraftResponse,
  type ArticleDraftStatus,
  type ArticleJobFailedEvent,
  type ArticlePromptCompletedEvent,
  type ArticlePromptRequestedEvent,
  type ArticleWritingCompletedEvent,
  type ArticleWritingRequestedEvent,
  type ScriptFact,
  type StudioBrandKitResponse,
  type WrittenArticle,
} from '@app/common';
import { toArticleHtml } from '../articles/article-html';
import { toTranslationRow } from '../articles/articles.mapper';
import { REQUESTER } from '../common/ai';
import type { ArticleDraftJob, Prisma, Site } from '../generated/prisma/client';
import { MediaGenerationService, monthStart } from '../media/media-generation.service';
import { MediaUrls } from '../media/media-urls';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { BrandKitService } from '../studio/brand-kit.service';
import { freeSlug, slugify } from '../translations/slug';
import { segmentsOf, TranslationJobsService } from '../translations/translation-jobs.service';
import { articleBodyHtml, unknownNumbers, type BodyImage } from './article-blocks';
import { NO_PRICES_SITES, rulesFor } from './site-rules';

type Tx = Prisma.TransactionClient;
type Idea = ArticleDraftResponse['idea'];

/**
 * Articles written by AI (ADR 0041), as jobs the admin follows:
 *
 *   create → `prompting` (ai-service writes the brief + outline) → `prompted` (the admin edits,
 *   confirms: `write`, counted in the monthly quota) → `writing` (the article as blocks) →
 *   `illustrating` (its AI images, the media library's quota) → `completed`: a DRAFT article in
 *   the chosen language (blocks → editor HTML, sanitized), and a machine-translation job into
 *   each of the site's other languages (ADR 0036), saved as draft translations to review.
 *   `failed` at any AI step (the brief can be confirmed again).
 *
 * Every step to another process goes through the outbox (same transaction); the answers arrive
 * through AiResultsConsumer, inside its inbox transaction.
 */
@Injectable()
export class ArticleDraftsService {
  private readonly logger = new Logger(ArticleDraftsService.name);
  private readonly perMonth: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly brand: BrandKitService,
    private readonly images: MediaGenerationService,
    private readonly urls: MediaUrls,
    private readonly outbox: OutboxRelay,
    private readonly translations: TranslationJobsService,
    config: ConfigService,
  ) {
    this.perMonth = config.getOrThrow<number>('CONTENT_AI_ARTICLES_PER_MONTH');
  }

  async create(
    siteId: string,
    dto: CreateArticleDraftDto,
    user: AuthUser,
  ): Promise<ArticleDraftResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    if (!site.locales.includes(dto.locale)) {
      throw new UnprocessableEntityException({
        message: `The site has no language ${dto.locale}`,
        code: 'invalid_locale',
      });
    }
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, siteId },
      include: { translations: true },
    });
    if (!category) {
      throw new UnprocessableEntityException({
        message: `categoryId ${dto.categoryId} is not a category of this site`,
        code: 'invalid_category',
      });
    }
    const idea: Idea = {
      topic: category.translations.find((t) => t.locale === dto.locale)?.name ?? category.key,
      idea: dto.idea.trim(),
      ...(dto.audience?.trim() && { audience: dto.audience.trim() }),
      ...(dto.keyword?.trim() && { keyword: dto.keyword.trim() }),
      length: dto.length,
      images: dto.images,
    };
    const brand = await this.brand.resolve(site);
    const published = await this.prisma.articleTranslation.findMany({
      where: { siteId, locale: dto.locale, article: { status: 'published' } },
      select: { title: true },
      orderBy: { article: { publishedAt: 'desc' } },
      take: 30,
    });

    const id = randomUUID();
    const event: ArticlePromptRequestedEvent = {
      jobId: id,
      requester: REQUESTER,
      siteId,
      language: dto.locale,
      brand: brandOf(brand),
      facts: factsOf(site, brand),
      rules: rulesFor(siteId),
      bannedPhrases: brand.bannedPhrases,
      existingTitles: published.map((p) => p.title),
      idea,
      actorId: user.id,
    };
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.articleDraftJob.create({
        data: {
          id,
          siteId,
          categoryId: category.id,
          locale: dto.locale,
          idea,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
      await addToOutbox(tx, ARTICLE_PROMPT_EVENTS.REQUESTED, event);
      return created;
    });
    this.outbox.poke();
    return toResponse(row);
  }

  async findOne(siteId: string, id: string, user: AuthUser): Promise<ArticleDraftResponse> {
    await this.sites.getAccessible(siteId, user);
    return toResponse(await this.getOrFail(siteId, id));
  }

  /**
   * The admin confirms the brief (as edited): the article is written (202). Only from
   * `prompted`, or `failed` after a brief (to try again); counted in the monthly quota.
   */
  async write(
    siteId: string,
    id: string,
    dto: WriteArticleDraftDto,
    user: AuthUser,
  ): Promise<ArticleDraftResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const job = await this.getOrFail(siteId, id);
    if (!(job.status === 'prompted' || (job.status === 'failed' && job.prompt))) {
      throw new ConflictException({
        message: `The article can't be written now (${job.status})`,
        code: 'busy',
      });
    }
    const idea = job.idea as unknown as Idea;
    const brand = await this.brand.resolve(site);
    const prompt = dto.prompt.trim();
    const outline = dto.outline.map((h) => h.trim()).filter(Boolean);
    const event: ArticleWritingRequestedEvent = {
      jobId: job.id,
      requester: REQUESTER,
      siteId,
      language: job.locale,
      prompt,
      outline,
      length: idea.length,
      images: idea.images,
      facts: factsOf(site, brand),
      rules: rulesFor(siteId),
      bannedPhrases: brand.bannedPhrases,
      actorId: user.id,
    };
    const row = await this.prisma.$transaction(async (tx) => {
      // One request per site at a time past this point: two can't both take the last article.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-articles:${siteId}`}))`;
      const used = await tx.articleDraftJob.count({
        where: { siteId, writtenAt: { gte: monthStart() }, NOT: { id: job.id } },
      });
      if (used >= this.perMonth) {
        throw new UnprocessableEntityException({
          message: `This site wrote its ${this.perMonth} AI articles this month`,
          code: 'quota_exceeded',
        });
      }
      const [updated] = await tx.articleDraftJob.updateManyAndReturn({
        where: { id: job.id, siteId, status: job.status },
        data: {
          status: 'writing',
          prompt,
          outline,
          writtenAt: job.writtenAt ?? new Date(),
          error: null,
          detail: null,
          updatedBy: user.id,
        },
      });
      if (!updated) throw new ConflictException({ message: 'The job changed', code: 'busy' });
      await addToOutbox(tx, ARTICLE_WRITING_EVENTS.REQUESTED, event);
      return updated;
    });
    this.outbox.poke();
    return toResponse(row);
  }

  /* ─────────────── Answers (inside the inbox transaction, AiResultsConsumer) ─────────────── */

  async briefWritten(tx: Tx, event: ArticlePromptCompletedEvent): Promise<void> {
    await tx.articleDraftJob.updateMany({
      where: { id: event.jobId, siteId: event.siteId, status: 'prompting' },
      data: {
        status: 'prompted',
        prompt: event.prompt,
        outline: event.outline,
        provider: event.provider.slice(0, 30),
        model: event.model.slice(0, 100),
      },
    });
  }

  briefFailed(tx: Tx, event: ArticleJobFailedEvent): Promise<unknown> {
    return this.failIn(tx, event, 'prompting');
  }

  articleFailed(tx: Tx, event: ArticleJobFailedEvent): Promise<unknown> {
    return this.failIn(tx, event, 'writing');
  }

  /**
   * The article: its numbers checked against the sources, then its images asked for (the cover
   * first) or, without images, built right away.
   */
  async articleWritten(tx: Tx, event: ArticleWritingCompletedEvent): Promise<void> {
    const job = await tx.articleDraftJob.findFirst({
      where: { id: event.jobId, siteId: event.siteId, status: 'writing' },
    });
    if (!job) return; // an old or duplicate answer
    const site = await tx.site.findUniqueOrThrow({ where: { id: job.siteId } });
    const idea = job.idea as unknown as Idea;
    const article = event.article;
    const brand = await this.brand.resolve(site);
    const warnings = unknownNumbers(article, [
      ...factsOf(site, brand).map((f) => f.text),
      job.prompt ?? '',
      ...((job.outline as string[] | null) ?? []),
      idea.idea,
      idea.keyword ?? '',
    ]);

    // The pictures: the cover first, then the images of the text, as many as asked.
    const prompts = [
      ...(article.coverPrompt ? [article.coverPrompt] : []),
      ...article.blocks.flatMap((b) => (b.type === 'image' && b.prompt ? [b.prompt] : [])),
    ].slice(0, idea.images);
    const imageJobIds: string[] = [];
    for (const prompt of prompts) {
      try {
        const { jobId } = await this.images.request(
          tx,
          job.siteId,
          prompt.slice(0, 1000),
          '16:9',
          1,
          job.createdBy,
        );
        imageJobIds.push(jobId);
      } catch (error) {
        if ((error as { response?: { code?: string } }).response?.code !== 'quota_exceeded') {
          throw error;
        }
        warnings.push('images_quota');
        break;
      }
    }
    const updated = await tx.articleDraftJob.update({
      where: { id: job.id },
      data: {
        status: imageJobIds.length ? 'illustrating' : 'writing',
        result: article as unknown as Prisma.InputJsonValue,
        imageJobIds,
        warnings,
        provider: event.provider.slice(0, 30),
        model: event.model.slice(0, 100),
      },
    });
    if (!imageJobIds.length) await this.build(tx, updated);
  }

  /** An image job of the media library finished: the article is built once all of its are. */
  async imageSettled(tx: Tx, imageJobId: string): Promise<void> {
    const job = await tx.articleDraftJob.findFirst({
      where: { status: 'illustrating', imageJobIds: { has: imageJobId } },
    });
    if (!job) return;
    const pending = await tx.imageGenerationJob.count({
      where: { id: { in: job.imageJobIds }, status: 'pending' },
    });
    if (!pending) await this.build(tx, job);
  }

  /**
   * The draft article, in its one language: blocks → HTML (sanitized like any body), its images
   * (made ones only; the cover is the first job's when the article asked for one), a free slug;
   * then one translation job per other language of the site (same transaction).
   */
  private async build(tx: Tx, job: ArticleDraftJob): Promise<void> {
    const article = job.result as unknown as WrittenArticle;
    const warnings = [...((job.warnings as string[] | null) ?? [])];

    const media = job.imageJobIds.length
      ? await tx.media.findMany({
          where: { generationJobId: { in: job.imageJobIds }, siteId: job.siteId, status: 'ready' },
        })
      : [];
    const pictures: (BodyImage | null)[] = job.imageJobIds.map((imageJobId) => {
      const row = media.find((m) => m.generationJobId === imageJobId);
      return row ? this.urls.image(row) : null;
    });
    if (pictures.some((p) => p === null)) warnings.push('images_failed');
    const hasCover = Boolean(article.coverPrompt) && job.imageJobIds.length > 0;
    const coverMedia = hasCover
      ? media.find((m) => m.generationJobId === job.imageJobIds[0])
      : undefined;
    const bodyImages = hasCover ? pictures.slice(1) : pictures;

    let body: string;
    try {
      body = toArticleHtml(
        job.locale,
        articleBodyHtml(article.blocks, bodyImages),
        this.urls.sitePrefix(job.siteId),
        this.urls.studioPrefix(job.siteId),
      );
    } catch (error) {
      await this.fail(tx, job, 'invalid_output', (error as Error).message);
      return;
    }
    const title = article.title.slice(0, 200);
    const slug = await freeSlug(slugify(title), async (candidate) => {
      const taken = await tx.articleTranslation.findUnique({
        where: { siteId_locale_slug: { siteId: job.siteId, locale: job.locale, slug: candidate } },
        select: { articleId: true },
      });
      return Boolean(taken);
    });
    const created = await tx.article.create({
      data: {
        siteId: job.siteId,
        categoryId: job.categoryId,
        coverMediaId: coverMedia?.id ?? null,
        createdBy: job.createdBy,
        updatedBy: job.createdBy,
      },
    });
    const translation: ArticleTranslationDto = {
      locale: job.locale,
      title,
      slug,
      excerpt: article.excerpt.slice(0, 500),
      coverAlt: coverMedia ? (article.coverAlt?.slice(0, 300) ?? null) : null,
      body,
      seoTitle: article.seoTitle?.slice(0, 200) ?? null,
      seoDescription: article.seoDescription?.slice(0, 300) ?? null,
    };
    await tx.articleTranslation.createMany({
      data: [toTranslationRow(job.siteId, created.id, translation)],
    });
    // A slug taken back from a redirect now belongs to this article (as in ArticlesService).
    await tx.articleSlugRedirect.deleteMany({
      where: { siteId: job.siteId, locale: job.locale, slug },
    });
    // The site's other languages: machine-translated from this one (ADR 0036), as draft
    // translations the admin reviews; too long for one job: the admin translates it later.
    const site = await tx.site.findUniqueOrThrow({ where: { id: job.siteId } });
    const others = site.locales.filter((locale) => locale !== job.locale);
    const source = {
      title,
      excerpt: translation.excerpt,
      coverAlt: translation.coverAlt,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      body,
    };
    const segments = others.length ? segmentsOf(source) : null;
    if (others.length && !segments) warnings.push('translation_too_large');
    if (segments) {
      for (const targetLocale of others) {
        await this.translations.requestIn(tx, {
          siteId: job.siteId,
          siteName: site.name,
          articleId: created.id,
          sourceLocale: job.locale,
          targetLocale,
          overwrite: false,
          source,
          segments,
          actorId: job.createdBy,
        });
      }
    }
    await tx.articleDraftJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        articleId: created.id,
        warnings,
        completedAt: new Date(),
      },
    });
    this.logger.log(`AI article ${job.id}: draft ${created.id} (${warnings.length} warning(s))`);
  }

  private async failIn(tx: Tx, event: ArticleJobFailedEvent, from: ArticleDraftStatus) {
    return tx.articleDraftJob.updateMany({
      where: { id: event.jobId, siteId: event.siteId, status: from },
      data: { status: 'failed', error: event.reason, detail: event.detail?.slice(0, 300) ?? null },
    });
  }

  private async fail(tx: Tx, job: ArticleDraftJob, error: string, detail?: string) {
    await tx.articleDraftJob.update({
      where: { id: job.id },
      data: { status: 'failed', error, detail: detail?.slice(0, 300) ?? null },
    });
  }

  private async getOrFail(siteId: string, id: string): Promise<ArticleDraftJob> {
    const job = await this.prisma.articleDraftJob.findFirst({ where: { id, siteId } });
    if (!job) throw new NotFoundException(`AI article ${id} not found`);
    return job;
  }
}

function brandOf(brand: StudioBrandKitResponse): ArticlePromptRequestedEvent['brand'] {
  return {
    name: brand.brandName,
    ...(brand.tagline && { tagline: brand.tagline }),
    ...(brand.tone && { tone: brand.tone }),
    ...(brand.callToAction && { callToAction: brand.callToAction }),
    ...(brand.phone && { phone: brand.phone }),
  };
}

/** The business's own facts from the brand kit (never written by AI); wine: no prices. */
export function factsOf(site: Pick<Site, 'id'>, brand: StudioBrandKitResponse): ScriptFact[] {
  const facts: [string, string | null][] = [
    ['website', brand.website],
    ['phone', brand.phone],
    ['address', brand.address],
    ['hours', brand.hours],
    ['prices', NO_PRICES_SITES.includes(site.id) ? null : brand.prices],
  ];
  return facts.flatMap(([id, text]) => (text?.trim() ? [{ id, text: text.trim() }] : []));
}

export function toResponse(row: ArticleDraftJob): ArticleDraftResponse {
  return {
    id: row.id,
    siteId: row.siteId,
    categoryId: row.categoryId,
    locale: row.locale,
    idea: row.idea as unknown as Idea,
    status: row.status as ArticleDraftStatus,
    prompt: row.prompt,
    outline: (row.outline as string[] | null) ?? [],
    articleId: row.articleId,
    warnings: (row.warnings as string[] | null) ?? [],
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
