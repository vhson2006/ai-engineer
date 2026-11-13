import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuthUser, StudioBrandKitResponse, UpsertStudioBrandKitDto } from '@app/common';
import type { Media, Site, StudioBrandKit } from '../generated/prisma/client';
import { MediaUrls } from '../media/media-urls';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { DEFAULT_ACCENT, DEFAULT_PRIMARY } from './composition';

type KitWithLogo = StudioBrandKit & { logoMedia: Media | null };

/**
 * The brand a site's clips use (ADR 0039): name, tagline, phone, call to action, tone, banned
 * phrases (never in a script), a line always on the brand card (wine: 18+), colours, logo, and the
 * business facts templates take as they are (website, address, hours, prices: typed once here,
 * never written by AI). A site without one gets defaults from its name, so a first clip works.
 */
@Injectable()
export class BrandKitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly urls: MediaUrls,
  ) {}

  async get(siteId: string, user: AuthUser): Promise<StudioBrandKitResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    return this.toResponse(site, await this.find(siteId));
  }

  /** For the studio's own use (no access check: the caller already did it). */
  async resolve(site: Site): Promise<StudioBrandKitResponse> {
    return this.toResponse(site, await this.find(site.id));
  }

  async upsert(
    siteId: string,
    dto: UpsertStudioBrandKitDto,
    user: AuthUser,
  ): Promise<StudioBrandKitResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    if (dto.logoMediaId) await this.readyImage(siteId, dto.logoMediaId);
    const data = {
      brandName: dto.brandName.trim(),
      tagline: dto.tagline?.trim() || null,
      phone: dto.phone?.trim() || null,
      callToAction: dto.callToAction?.trim() || null,
      tone: dto.tone?.trim() || null,
      footerNote: dto.footerNote?.trim() || null,
      website: dto.website?.trim() || null,
      address: dto.address?.trim() || null,
      hours: dto.hours?.trim() || null,
      prices: dto.prices?.trim() || null,
      bannedPhrases: [...new Set(dto.bannedPhrases.map((p) => p.trim()).filter(Boolean))],
      primaryColor: dto.primaryColor.toLowerCase(),
      accentColor: dto.accentColor.toLowerCase(),
      logoMediaId: dto.logoMediaId ?? null,
      updatedBy: user.id,
    };
    const row = await this.prisma.studioBrandKit.upsert({
      where: { siteId },
      create: { siteId, ...data },
      update: data,
      include: { logoMedia: true },
    });
    return this.toResponse(site, row);
  }

  private find(siteId: string): Promise<KitWithLogo | null> {
    return this.prisma.studioBrandKit.findUnique({
      where: { siteId },
      include: { logoMedia: true },
    });
  }

  /** A ready image of THIS site, else 422 (another site's id says nothing more). */
  async readyImage(siteId: string, mediaId: string): Promise<Media> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, siteId, status: 'ready' },
    });
    if (!media) {
      throw new UnprocessableEntityException({
        message: `Image ${mediaId} is not a ready image of this site`,
        code: 'invalid_media',
      });
    }
    return media;
  }

  private toResponse(site: Site, kit: KitWithLogo | null): StudioBrandKitResponse {
    return {
      siteId: site.id,
      brandName: kit?.brandName ?? site.name,
      tagline: kit?.tagline ?? null,
      phone: kit?.phone ?? null,
      callToAction: kit?.callToAction ?? null,
      tone: kit?.tone ?? null,
      footerNote: kit?.footerNote ?? null,
      website: kit?.website ?? null,
      address: kit?.address ?? null,
      hours: kit?.hours ?? null,
      prices: kit?.prices ?? null,
      bannedPhrases: kit?.bannedPhrases ?? [],
      primaryColor: kit?.primaryColor ?? DEFAULT_PRIMARY,
      accentColor: kit?.accentColor ?? DEFAULT_ACCENT,
      logo: kit?.logoMedia?.status === 'ready' ? this.urls.image(kit.logoMedia) : null,
      updatedAt: kit?.updatedAt.toISOString() ?? null,
    };
  }
}
