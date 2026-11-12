import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  addToOutbox,
  ARTICLE_EVENTS,
  ArticleResponse,
  AuthUser,
  CreateArticleDto,
  ListArticlesQueryDto,
  OutboxRelay,
  paginate,
  Paginated,
  UpdateArticleDto,
  type ArticleTranslationDto,
} from '@app/common';
import { canPublish } from '../common/site-access';
import { assertAllLocales, assertSiteLocales } from '../common/translations';
import type { Article, Prisma, Site } from '../generated/prisma/client';
import { MediaUrls } from '../media/media-urls';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { liveEvent, unpublishedEvent } from './article-events';
import { withCleanBodies } from './article-html';
import {
  ArticleRow,
  toArticleResponse,
  toTranslationRow,
  WITH_TRANSLATIONS,
} from './articles.mapper';

type Tx = Prisma.TransactionClient;

/**
 * Articles of a site, as admins manage them (ADR 0026): list, read, create, edit, delete.
 * Publishing, scheduling and unpublishing: ArticlePublishingService. Rules:
 *  - the caller must belong to the site (SitesService.getAccessible, 404 otherwise);
 *  - drafts may miss languages; changing a live or scheduled article needs every language of
 *    the site (422 missing_translations);
 *  - only content:publish touches an article that is not a draft (403);
 *  - a live article's old slugs keep working through redirects;
 *  - changing a live article and deleting it are events (outbox, same transaction).
 */
@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly outbox: OutboxRelay,
    private readonly media: MediaService,
    private readonly urls: MediaUrls,
  ) {}

  async findAll(
    siteId: string,
    query: ListArticlesQueryDto,
    user: AuthUser,
  ): Promise<Paginated<ArticleResponse>> {
    await this.sites.getAccessible(siteId, user);
    const { page, limit, status, categoryId, search } = query;
    const where: Prisma.ArticleWhereInput = {
      siteId,
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(search && {
        translations: { some: { title: { contains: search, mode: 'insensitive' } } },
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: WITH_TRANSLATIONS,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginate(
      rows.map((row) => toArticleResponse(row, this.urls)),
      total,
      page,
      limit,
    );
  }

  async findOne(siteId: string, id: string, user: AuthUser): Promise<ArticleResponse> {
    await this.sites.getAccessible(siteId, user);
    return toArticleResponse(await this.getOrFail(siteId, id), this.urls);
  }

  async create(siteId: string, dto: CreateArticleDto, user: AuthUser): Promise<ArticleResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    assertSiteLocales(dto.translations, site);
    // Before any write (400 if empty): body images only from this site.
    const translations = withCleanBodies(dto.translations, this.urls.sitePrefix(siteId));
    await this.assertCategory(siteId, dto.categoryId);
    if (dto.coverMediaId) await this.media.assertCover(siteId, dto.coverMediaId);

    // Slugs are unique per site + language: the constraint is the guard (409), not a pre-check.
    const row = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          siteId,
          categoryId: dto.categoryId,
          featured: dto.featured ?? false,
          coverMediaId: dto.coverMediaId ?? null,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
      await writeTranslations(tx, site, article.id, translations);
      return tx.article.findUniqueOrThrow({
        where: { id: article.id },
        include: WITH_TRANSLATIONS,
      });
    });
    return toArticleResponse(row, this.urls);
  }

  async update(
    siteId: string,
    id: string,
    dto: UpdateArticleDto,
    user: AuthUser,
  ): Promise<ArticleResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const current = await this.getOrFail(siteId, id);
    assertMayChange(current, user);
    if (dto.translations) {
      assertSiteLocales(dto.translations, site);
      if (current.status !== 'draft') assertAllLocales(dto.translations, site);
    }
    if (dto.categoryId && dto.categoryId !== current.categoryId) {
      await this.assertCategory(siteId, dto.categoryId);
    }
    if (dto.coverMediaId && dto.coverMediaId !== current.coverMediaId) {
      await this.media.assertCover(siteId, dto.coverMediaId);
    }

    const { translations: input, ...fields } = dto;
    // Before any write (400 if empty): body images only from this site.
    const translations = input && withCleanBodies(input, this.urls.sitePrefix(siteId));
    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.article.updateMany({
        where: { id, siteId },
        data: { ...fields, updatedBy: user.id },
      });
      if (!count) return null;
      if (translations) {
        if (current.status === 'published') {
          await keepOldSlugs(tx, current, translations);
        }
        await tx.articleTranslation.deleteMany({ where: { articleId: id } });
        await writeTranslations(tx, site, id, translations);
      }
      const row = await tx.article.findUniqueOrThrow({ where: { id }, include: WITH_TRANSLATIONS });
      if (row.status === 'published') {
        await addToOutbox(tx, ARTICLE_EVENTS.UPDATED, liveEvent(row, user.id));
      }
      return row;
    });
    if (!saved) throw new NotFoundException(`Article ${id} not found`); // deleted in between
    if (saved.status === 'published') this.outbox.poke();
    return toArticleResponse(saved, this.urls);
  }

  /** Deleted for real (its slugs become free). A live article leaves the site: event. */
  async remove(siteId: string, id: string, user: AuthUser): Promise<void> {
    await this.sites.getAccessible(siteId, user);
    const current = await this.getOrFail(siteId, id);
    assertMayChange(current, user);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.article.deleteMany({ where: { id, siteId } });
      if (count && current.status === 'published') {
        await addToOutbox(tx, ARTICLE_EVENTS.UNPUBLISHED, unpublishedEvent(current, user.id));
      }
      return count;
    });
    if (!deleted) throw new NotFoundException(`Article ${id} not found`); // deleted in between
    if (current.status === 'published') this.outbox.poke();
  }

  /** The article of THIS site (another site's id answers 404), with every language. */
  async getOrFail(siteId: string, id: string): Promise<ArticleRow> {
    const row = await this.prisma.article.findFirst({
      where: { id, siteId },
      include: WITH_TRANSLATIONS,
    });
    if (!row) throw new NotFoundException(`Article ${id} not found`);
    return row;
  }

  private async assertCategory(siteId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, siteId },
      select: { id: true },
    });
    if (!category) {
      throw new UnprocessableEntityException({
        message: `categoryId ${categoryId} is not a category of this site`,
        code: 'invalid_category',
      });
    }
  }
}

/** Drafts: any content writer of the site. Scheduled or live articles: content:publish only. */
function assertMayChange(article: Article, user: AuthUser): void {
  if (article.status !== 'draft' && !canPublish(user)) {
    throw new ForbiddenException(
      'Only content:publish may change or delete an article that is scheduled or published',
    );
  }
}

/** Writes the translations; a slug taken back from a redirect now belongs to this article. */
async function writeTranslations(
  tx: Tx,
  site: Site,
  articleId: string,
  translations: ArticleTranslationDto[],
): Promise<void> {
  await tx.articleTranslation.createMany({
    data: translations.map((t) => toTranslationRow(site.id, articleId, t)),
  });
  await tx.articleSlugRedirect.deleteMany({
    where: { siteId: site.id, OR: translations.map((t) => ({ locale: t.locale, slug: t.slug })) },
  });
}

/** A live article whose slug changes keeps the old one as a redirect (links, search results). */
async function keepOldSlugs(
  tx: Tx,
  current: ArticleRow,
  next: ArticleTranslationDto[],
): Promise<void> {
  const changed = current.translations.filter((old) => {
    const replacement = next.find((t) => t.locale === old.locale);
    return replacement && replacement.slug !== old.slug;
  });
  if (!changed.length) return;
  await tx.articleSlugRedirect.createMany({
    data: changed.map((old) => ({
      siteId: current.siteId,
      locale: old.locale,
      slug: old.slug,
      articleId: current.id,
    })),
    skipDuplicates: true,
  });
}
