import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, CreateSiteDto, SiteResponse, UpdateSiteDto } from '@app/common';
import type { Site } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toSiteResponse } from './sites.mapper';
import { canAccessSite, managesAllSites, memberSiteIds } from '../common/site-access';

/**
 * The client sites and their languages (ADR 0025). Anyone with content roles sees the sites they
 * belong to; only content:admin creates or changes a site (roles checked by KrakenD + @Roles).
 */
@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<SiteResponse[]> {
    const rows = await this.prisma.site.findMany({
      where: managesAllSites(user) ? {} : { id: { in: memberSiteIds(user) } },
      orderBy: { id: 'asc' },
    });
    return rows.map(toSiteResponse);
  }

  async findOne(siteId: string, user: AuthUser): Promise<SiteResponse> {
    return toSiteResponse(await this.getAccessible(siteId, user));
  }

  /**
   * The site, if it exists AND the caller may see it. Another tenant's site answers 404 like an
   * unknown one: never reveal which sites exist.
   */
  async getAccessible(siteId: string, user: AuthUser): Promise<Site> {
    const site = canAccessSite(user, siteId)
      ? await this.prisma.site.findUnique({ where: { id: siteId } })
      : null;
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    return site;
  }

  async create(dto: CreateSiteDto): Promise<SiteResponse> {
    assertDefaultLocale(dto.locales, dto.defaultLocale);
    // The primary key is the duplicate guard (409 "A site with this id already exists").
    return toSiteResponse(await this.prisma.site.create({ data: dto }));
  }

  async update(siteId: string, dto: UpdateSiteDto, user: AuthUser): Promise<SiteResponse> {
    const current = await this.getAccessible(siteId, user);
    assertDefaultLocale(dto.locales ?? current.locales, dto.defaultLocale ?? current.defaultLocale);

    const [row] = await this.prisma.site.updateManyAndReturn({
      where: { id: siteId },
      data: dto,
    });
    if (!row) throw new NotFoundException(`Site ${siteId} not found`);
    return toSiteResponse(row);
  }
}

function assertDefaultLocale(locales: string[], defaultLocale: string): void {
  if (!locales.includes(defaultLocale)) {
    throw new BadRequestException(`defaultLocale ${defaultLocale} must be one of the locales`);
  }
}
