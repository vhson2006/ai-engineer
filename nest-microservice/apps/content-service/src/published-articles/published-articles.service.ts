import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthUser,
  ListPublishedArticlesQueryDto,
  paginate,
  Paginated,
  PublishedArticleBySlugQueryDto,
  PublishedArticleResponse,
  PublishedArticleSummary,
} from '@app/common';
import type { Prisma, Site } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaUrls } from '../media/media-urls';
import { SitesService } from '../sites/sites.service';
import { liveInclude, toSummary } from './published-articles.mapper';

/**
 * What a site shows: published articles in one language. Read by the sites' servers (BFF) with a
 * content:read token for that site. Old slugs resolve to the article, whose `slug` is then the
 * current one: the site answers 301 to it (KrakenD follows redirects, so the API never does).
 */
@Injectable()
export class PublishedArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly urls: MediaUrls,
  ) {}

  async list(
    siteId: string,
    query: ListPublishedArticlesQueryDto,
    user: AuthUser,
  ): Promise<Paginated<PublishedArticleSummary>> {
    const site = await this.sites.getAccessible(siteId, user);
    const { locale, category, page, limit } = query;
    assertLocale(site, locale);

    let categoryId: string | undefined;
    if (category) {
      const found = await this.prisma.categoryTranslation.findUnique({
        where: { siteId_locale_slug: { siteId, locale, slug: category } },
        select: { categoryId: true },
      });
      if (!found) throw new NotFoundException(`Category ${category} not found`);
      categoryId = found.categoryId;
    }

    const where: Prisma.ArticleWhereInput = {
      siteId,
      status: 'published',
      ...(categoryId && { categoryId }),
      translations: { some: { locale } },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: liveInclude(locale),
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginate(
      rows.map((row) => toSummary(row, locale, this.urls)),
      total,
      page,
      limit,
    );
  }

  async bySlug(
    siteId: string,
    query: PublishedArticleBySlugQueryDto,
    user: AuthUser,
  ): Promise<PublishedArticleResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const { locale, slug } = query;
    assertLocale(site, locale);
    const key = { siteId_locale_slug: { siteId, locale, slug } };

    const current = await this.prisma.articleTranslation.findUnique({
      where: key,
      select: { articleId: true },
    });
    const articleId =
      current?.articleId ??
      (
        await this.prisma.articleSlugRedirect.findUnique({
          where: key,
          select: { articleId: true },
        })
      )?.articleId;

    const row = articleId
      ? await this.prisma.article.findFirst({
          where: { id: articleId, siteId, status: 'published' },
          include: { ...liveInclude(locale), translations: true },
        })
      : null;
    const translation = row?.translations.find((t) => t.locale === locale);
    if (!row || !translation) throw new NotFoundException(`Article ${slug} not found`);

    return {
      ...toSummary(row, locale, this.urls),
      body: translation.body,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      alternates: [...row.translations]
        .sort((a, b) => a.locale.localeCompare(b.locale))
        .map((t) => ({ locale: t.locale, slug: t.slug })),
    };
  }
}

function assertLocale(site: Site, locale: string): void {
  if (!site.locales.includes(locale)) {
    throw new BadRequestException(`${locale} is not a language of site ${site.id}`);
  }
}
