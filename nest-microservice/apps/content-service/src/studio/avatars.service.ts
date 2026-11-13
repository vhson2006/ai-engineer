import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthUser,
  CreateStudioAvatarDto,
  StudioAvatarResponse,
  UpdateStudioAvatarDto,
} from '@app/common';
import type { Media, StudioAvatar } from '../generated/prisma/client';
import { MediaUrls } from '../media/media-urls';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { BrandKitService } from './brand-kit.service';

type AvatarWithMedia = StudioAvatar & { media: Media };

/**
 * The hosts of a site's clips (ADR 0039): a face from the media library, a default voice and the
 * consent note (who agreed to appear, or the stock licence). Deleting an avatar leaves the
 * projects that used it without a host until another one is picked.
 */
@Injectable()
export class AvatarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly brand: BrandKitService,
    private readonly urls: MediaUrls,
  ) {}

  async list(siteId: string, user: AuthUser): Promise<StudioAvatarResponse[]> {
    await this.sites.getAccessible(siteId, user);
    const rows = await this.prisma.studioAvatar.findMany({
      where: { siteId },
      include: { media: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  async create(
    siteId: string,
    dto: CreateStudioAvatarDto,
    user: AuthUser,
  ): Promise<StudioAvatarResponse> {
    await this.sites.getAccessible(siteId, user);
    await this.brand.readyImage(siteId, dto.mediaId);
    const row = await this.prisma.studioAvatar.create({
      data: {
        siteId,
        name: dto.name.trim(),
        mediaId: dto.mediaId,
        voice: dto.voice,
        consentNote: dto.consentNote.trim(),
        createdBy: user.id,
      },
      include: { media: true },
    });
    return this.toResponse(row);
  }

  async update(
    siteId: string,
    id: string,
    dto: UpdateStudioAvatarDto,
    user: AuthUser,
  ): Promise<StudioAvatarResponse> {
    await this.sites.getAccessible(siteId, user);
    if (dto.mediaId) await this.brand.readyImage(siteId, dto.mediaId);
    const { count } = await this.prisma.studioAvatar.updateMany({
      where: { id, siteId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.mediaId !== undefined && { mediaId: dto.mediaId }),
        ...(dto.voice !== undefined && { voice: dto.voice }),
        ...(dto.consentNote !== undefined && { consentNote: dto.consentNote.trim() }),
      },
    });
    if (!count) throw new NotFoundException(`Avatar ${id} not found`);
    return this.toResponse(await this.getOrFail(siteId, id));
  }

  async remove(siteId: string, id: string, user: AuthUser): Promise<void> {
    await this.sites.getAccessible(siteId, user);
    const { count } = await this.prisma.studioAvatar.deleteMany({ where: { id, siteId } });
    if (!count) throw new NotFoundException(`Avatar ${id} not found`);
  }

  /** Avatars of this site by id (projects resolve their slots with it). */
  findMany(siteId: string, ids: string[]): Promise<AvatarWithMedia[]> {
    return ids.length
      ? this.prisma.studioAvatar.findMany({
          where: { siteId, id: { in: ids } },
          include: { media: true },
        })
      : Promise.resolve([]);
  }

  private async getOrFail(siteId: string, id: string): Promise<AvatarWithMedia> {
    const row = await this.prisma.studioAvatar.findFirst({
      where: { id, siteId },
      include: { media: true },
    });
    if (!row) throw new NotFoundException(`Avatar ${id} not found`);
    return row;
  }

  private toResponse(row: AvatarWithMedia): StudioAvatarResponse {
    return {
      id: row.id,
      siteId: row.siteId,
      name: row.name,
      voice: row.voice,
      consentNote: row.consentNote,
      image: this.urls.image(row.media),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
