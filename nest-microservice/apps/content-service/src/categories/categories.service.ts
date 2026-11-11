import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, CategoryResponse, CreateCategoryDto, UpdateCategoryDto } from '@app/common';
import { PrismaService } from '../prisma/prisma.service';
import { toCategoryResponse, WITH_TRANSLATIONS } from './categories.mapper';
import { SitesService } from '../sites/sites.service';
import { assertSiteLocales } from '../common/translations';

/** Topics of a site's articles, with a name and a URL slug per language. */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
  ) {}

  async list(siteId: string, user: AuthUser): Promise<CategoryResponse[]> {
    await this.sites.getAccessible(siteId, user);
    const rows = await this.prisma.category.findMany({
      where: { siteId },
      include: WITH_TRANSLATIONS,
      orderBy: [{ position: 'asc' }, { key: 'asc' }],
    });
    return rows.map(toCategoryResponse);
  }

  async findOne(siteId: string, id: string, user: AuthUser): Promise<CategoryResponse> {
    await this.sites.getAccessible(siteId, user);
    return toCategoryResponse(await this.getOrFail(siteId, id));
  }

  async create(siteId: string, dto: CreateCategoryDto, user: AuthUser): Promise<CategoryResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    assertSiteLocales(dto.translations, site);
    // Unique key and slugs are guarded by the constraints (409), not by a pre-check.
    const row = await this.prisma.category.create({
      data: {
        siteId,
        key: dto.key,
        position: dto.position ?? 0,
        translations: { create: dto.translations.map((t) => ({ ...t, siteId })) },
      },
      include: WITH_TRANSLATIONS,
    });
    return toCategoryResponse(row);
  }

  async update(
    siteId: string,
    id: string,
    dto: UpdateCategoryDto,
    user: AuthUser,
  ): Promise<CategoryResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    if (dto.translations) assertSiteLocales(dto.translations, site);

    const { translations, ...fields } = dto;
    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.category.updateMany({
        where: { id, siteId },
        data: fields,
      });
      if (!count) return null;
      if (translations) {
        await tx.categoryTranslation.deleteMany({ where: { categoryId: id } });
        await tx.categoryTranslation.createMany({
          data: translations.map((t) => ({ ...t, siteId, categoryId: id })),
        });
      }
      return tx.category.findUniqueOrThrow({ where: { id }, include: WITH_TRANSLATIONS });
    });
    if (!saved) throw new NotFoundException(`Category ${id} not found`); // deleted in between
    return toCategoryResponse(saved);
  }

  /** A category still used by an article can't be deleted: 422 (foreign key, from the database). */
  async remove(siteId: string, id: string, user: AuthUser): Promise<void> {
    await this.sites.getAccessible(siteId, user);
    const { count } = await this.prisma.category.deleteMany({ where: { id, siteId } });
    if (!count) throw new NotFoundException(`Category ${id} not found`);
  }

  private async getOrFail(siteId: string, id: string) {
    const row = await this.prisma.category.findFirst({
      where: { id, siteId },
      include: WITH_TRANSLATIONS,
    });
    if (!row) throw new NotFoundException(`Category ${id} not found`);
    return row;
  }
}
