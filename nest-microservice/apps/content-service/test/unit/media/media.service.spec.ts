import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InMemoryObjectStorage, ValidationProblemException } from '@app/common';
import { site, users } from '../../support/fixtures';
import { mediaProviders, mediaRow } from '../../support/media';
import { createPrismaMock, resetPrismaMock } from '../../support/prisma-mock';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { checkVariants, MediaService } from '../../../src/media/media.service';

describe('[media.service] (unit)', () => {
  let service: MediaService;
  let storage: InMemoryObjectStorage;
  const prisma = createPrismaMock();
  const { writer, outsider } = users;
  const row = mediaRow();
  const key = (width: number) => `media/nails/${row.id}/${width}.webp`;

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    storage = new InMemoryObjectStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: PrismaService, useValue: prisma },
        ...mediaProviders(storage),
      ],
    }).compile();
    service = moduleRef.get(MediaService);
  });

  describe('createUpload', () => {
    const dto = {
      filename: '../../etc/Shop front.JPG',
      contentType: 'image/webp' as const,
      variants: [
        { width: 1280, height: 853, size: 120_000 },
        { width: 640, height: 427, size: 40_000 },
      ],
    };

    it('stores a pending image and answers one public presigned PUT per size, narrowest first', async () => {
      prisma.media.create.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...row, ...data, status: 'pending', createdAt: new Date() }),
      );
      const result = await service.createUpload('nails', dto, writer);

      const data = prisma.media.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        siteId: 'nails',
        filename: 'Shop front.JPG', // display only: no path
        width: 1280,
        height: 853,
        createdBy: writer.id,
      });
      expect(result.uploads.map((u) => u.width)).toEqual([640, 1280]);
      expect(result.uploads[0].url).toBe(
        `https://storage.test/public/media/nails/${data.id}/640.webp?signature=x`,
      );
      expect(result.uploads[0].headers).toEqual({
        'Content-Type': 'image/webp',
        'Content-Length': '40000',
      });
      expect(result.media.srcset).toBe(
        `https://cdn.test/media/nails/${data.id}/640.webp 640w, https://cdn.test/media/nails/${data.id}/1280.webp 1280w`,
      );
    });

    it('refuses a site the caller does not manage, before writing', async () => {
      await expect(service.createUpload('nails', dto, outsider)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.media.create).not.toHaveBeenCalled();
    });
  });

  describe('checkVariants', () => {
    it('refuses duplicate widths and sizes of another image', () => {
      expect(() =>
        checkVariants([
          { width: 640, height: 427, size: 1 },
          { width: 640, height: 427, size: 1 },
        ]),
      ).toThrow(ValidationProblemException);
      expect(() =>
        checkVariants([
          { width: 640, height: 640, size: 1 },
          { width: 1280, height: 853, size: 1 },
        ]),
      ).toThrow(ValidationProblemException);
    });

    it('accepts rounding differences of the ratio', () => {
      expect(
        checkVariants([
          { width: 1920, height: 1281, size: 1 },
          { width: 640, height: 426, size: 1 },
        ]).map((v) => v.width),
      ).toEqual([640, 1920]);
    });
  });

  describe('complete', () => {
    beforeEach(() => prisma.media.findFirst.mockResolvedValue(mediaRow({ status: 'pending' })));

    it('marks the image ready when every size is stored as declared', async () => {
      storage.put('public', key(640), { size: 40_000, contentType: 'image/webp' });
      storage.put('public', key(1280), { size: 120_000, contentType: 'image/webp' });
      prisma.media.findFirst
        .mockResolvedValueOnce(mediaRow({ status: 'pending' }))
        .mockResolvedValueOnce(row);

      await expect(service.complete('nails', row.id, writer)).resolves.toMatchObject({
        status: 'ready',
      });
      expect(prisma.media.updateMany).toHaveBeenCalledWith({
        where: { id: row.id, siteId: 'nails', status: 'pending' },
        data: { status: 'ready', uploadedAt: expect.any(Date) },
      });
    });

    it('answers 409 while a size is missing, and keeps everything', async () => {
      storage.put('public', key(640), { size: 40_000, contentType: 'image/webp' });
      await expect(service.complete('nails', row.id, writer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(storage.deleted).toEqual([]);
    });

    it('deletes the objects and the row when a size differs from what was declared', async () => {
      storage.put('public', key(640), { size: 40_000, contentType: 'image/webp' });
      storage.put('public', key(1280), { size: 999_999, contentType: 'text/html' });
      await expect(service.complete('nails', row.id, writer)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(storage.deleted).toEqual([`public:${key(640)}`, `public:${key(1280)}`]);
      expect(prisma.media.deleteMany).toHaveBeenCalledWith({
        where: { id: row.id, siteId: 'nails', status: 'pending' },
      });
    });

    it('answers 404 for an image of another site (queried by site)', async () => {
      prisma.media.findFirst.mockReset().mockResolvedValue(null);
      await expect(service.complete('nails', row.id, writer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.media.findFirst).toHaveBeenCalledWith({
        where: { id: row.id, siteId: 'nails' },
      });
    });
  });

  describe('remove', () => {
    beforeEach(() => prisma.media.findFirst.mockResolvedValue(row));

    it('refuses an image used as a cover or in a body (409), deleting nothing', async () => {
      prisma.article.count.mockResolvedValue(0);
      prisma.articleTranslation.count.mockResolvedValue(1);
      await expect(service.remove('nails', row.id, writer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.articleTranslation.count).toHaveBeenCalledWith({
        where: { siteId: 'nails', body: { contains: `/${row.id}/` } },
      });
      expect(storage.deleted).toEqual([]);
      expect(prisma.media.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes every size, then the row', async () => {
      prisma.article.count.mockResolvedValue(0);
      prisma.articleTranslation.count.mockResolvedValue(0);
      prisma.media.deleteMany.mockResolvedValue({ count: 1 });
      await service.remove('nails', row.id, writer);
      expect(storage.deleted).toEqual([`public:${key(640)}`, `public:${key(1280)}`]);
      expect(prisma.media.deleteMany).toHaveBeenCalledWith({
        where: { id: row.id, siteId: 'nails' },
      });
    });
  });

  describe('assertCover', () => {
    it('accepts a ready image of the site only', async () => {
      prisma.media.findFirst.mockResolvedValue(null);
      await expect(service.assertCover('nails', row.id)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(prisma.media.findFirst).toHaveBeenCalledWith({
        where: { id: row.id, siteId: 'nails', status: 'ready' },
        select: { id: true },
      });
    });
  });

  describe('AI images (ADR 0037)', () => {
    const ai = (status: string) => mediaRow({ source: 'ai', status, variants: [], prompt: 'x' });

    it('a pending AI image cannot be deleted (ai-service is writing it) nor completed by hand', async () => {
      prisma.media.findFirst.mockResolvedValue(ai('pending'));
      await expect(service.remove('nails', row.id, writer)).rejects.toThrow(ConflictException);
      await expect(service.complete('nails', row.id, writer)).rejects.toThrow(NotFoundException);
      expect(prisma.media.deleteMany).not.toHaveBeenCalled();
      expect(prisma.media.updateMany).not.toHaveBeenCalled();
    });

    it('answers source, prompt and error', () => {
      expect(service.toResponse(ai('failed') as never)).toMatchObject({
        source: 'ai',
        prompt: 'x',
        error: null,
        variants: [],
      });
    });
  });

  describe('purgePending', () => {
    it('deletes the objects and rows of old pending uploads, and keeps going after a failure', async () => {
      const broken = mediaRow({ id: '00000000-0000-4000-8000-000000000001', status: 'pending' });
      prisma.media.findMany.mockResolvedValue([broken, mediaRow({ status: 'pending' })]);
      prisma.media.deleteMany
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce({ count: 1 });
      await expect(service.purgePending(new Date())).resolves.toBe(1);
      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['pending', 'failed'] }, createdAt: { lt: expect.any(Date) } },
        }),
      );
    });
  });
});
