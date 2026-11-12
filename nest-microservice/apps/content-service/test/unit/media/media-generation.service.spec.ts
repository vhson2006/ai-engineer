import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  IMAGE_GENERATION_EVENTS,
  OutboxRelay,
  type ImageGenerationRequestedEvent,
} from '@app/common';
import { site, users } from '../../support/fixtures';
import { mediaProviders, mediaRow } from '../../support/media';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { MediaGenerationService, monthStart } from '../../../src/media/media-generation.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';

describe('[media-generation.service] (unit)', () => {
  let service: MediaGenerationService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const { writer, outsider } = users;
  const JOB = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const A = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
  const B = '5b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const dto = { prompt: '  A bright laundromat  ', aspectRatio: '16:9' as const, count: 2 };
  const job = (overrides: Record<string, unknown> = {}) => ({
    id: JOB,
    siteId: 'nails',
    prompt: 'A bright laundromat',
    aspectRatio: '16:9',
    count: 2,
    status: 'pending',
    generated: null,
    provider: null,
    model: null,
    error: null,
    createdBy: writer.id,
    createdAt: new Date(),
    completedAt: null,
    media: [],
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    prisma.imageGenerationJob.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        SitesService,
        MediaGenerationService,
        ...mediaProviders(),
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: ConfigService, useValue: { getOrThrow: () => 5 } },
      ],
    }).compile();
    service = moduleRef.get(MediaGenerationService);
  });

  describe('generate', () => {
    it('stores the job and pending AI rows, and asks ai-service in the same transaction', async () => {
      prisma.imageGenerationJob.findFirst.mockImplementation(() =>
        Promise.resolve(
          job({ media: [mediaRow({ id: A, source: 'ai', status: 'pending', variants: [] })] }),
        ),
      );
      const result = await service.generate('nails', dto, writer);

      expect(prisma.$executeRaw).toHaveBeenCalled(); // the per-site lock
      const [[{ data: rows }]] = prisma.media.createMany.mock.calls as [
        [{ data: { id: string }[] }],
      ];
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        siteId: 'nails',
        source: 'ai',
        prompt: 'A bright laundromat',
        contentType: 'image/webp',
        width: 16,
        height: 9,
        variants: [],
        createdBy: writer.id,
      });
      expect(outboxSubjects(prisma)).toEqual([IMAGE_GENERATION_EVENTS.REQUESTED]);
      const event = outboxPayload<ImageGenerationRequestedEvent>(prisma);
      expect(event).toMatchObject({
        requester: 'content-service',
        siteId: 'nails',
        aspectRatio: '16:9',
      });
      expect(event.targets.map((t) => t.keyPrefix)).toEqual(
        rows.map((r) => `media/nails/${r.id}/`),
      );
      expect(outbox.poke).toHaveBeenCalled();
      expect(result).toMatchObject({ status: 'pending', remaining: 3 });
    });

    it('refuses past the monthly quota (made images, else asked) with nothing written', async () => {
      prisma.imageGenerationJob.findMany.mockResolvedValue([
        { count: 4, generated: 1 }, // only 1 made
        { count: 2, generated: null }, // still pending: 2
      ]);
      await expect(service.generate('nails', { ...dto, count: 3 }, writer)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'quota_exceeded' }),
      });
      expect(prisma.imageGenerationJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { siteId: 'nails', createdAt: { gte: monthStart() } } }),
      );
      expect(prisma.media.createMany).not.toHaveBeenCalled();
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('another site answers 404 before anything is counted', async () => {
      await expect(service.generate('nails', dto, outsider)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  it("get: another site's job answers 404", async () => {
    prisma.imageGenerationJob.findFirst.mockResolvedValue(null);
    await expect(service.get('nails', JOB, writer)).rejects.toThrow(NotFoundException);
    expect(prisma.imageGenerationJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: JOB, siteId: 'nails' } }),
    );
  });

  describe('results', () => {
    const variants = [
      { width: 1376, height: 768, size: 90_000 },
      { width: 640, height: 357, size: 20_000 },
    ];
    const completed = {
      jobId: JOB,
      requester: 'content-service',
      siteId: 'nails',
      images: [{ mediaId: A, contentType: 'image/webp', variants }],
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite-image',
    };

    it('completed: the images made become ready, the others failed, the job counts what was made', async () => {
      prisma.imageGenerationJob.findUnique.mockResolvedValue(job());
      prisma.media.updateMany.mockResolvedValue({ count: 1 });
      await service.complete(prisma as never, completed);

      expect(prisma.media.updateMany.mock.calls[0][0]).toEqual({
        where: { id: A, siteId: 'nails', generationJobId: JOB, status: 'pending' },
        data: expect.objectContaining({
          status: 'ready',
          width: 1376,
          height: 768,
          variants: [variants[1], variants[0]], // narrowest first
        }),
      });
      expect(prisma.media.updateMany.mock.calls[1][0]).toEqual({
        where: { generationJobId: JOB, status: 'pending' },
        data: { status: 'failed', error: 'not_generated' },
      });
      expect(prisma.imageGenerationJob.update.mock.calls[0][0].data).toMatchObject({
        status: 'completed',
        generated: 1,
        provider: 'gemini',
      });
    });

    it('ignores an image that is not WebP/JPEG or too wide, and answers for unknown or answered jobs', async () => {
      prisma.imageGenerationJob.findUnique.mockResolvedValue(job());
      prisma.media.updateMany.mockResolvedValue({ count: 1 });
      await service.complete(prisma as never, {
        ...completed,
        images: [
          { mediaId: A, contentType: 'image/svg+xml', variants },
          {
            mediaId: B,
            contentType: 'image/webp',
            variants: [{ width: 4000, height: 2000, size: 1 }],
          },
        ],
      });
      expect(prisma.media.updateMany).toHaveBeenCalledTimes(1); // only "the rest failed"
      expect(prisma.imageGenerationJob.update.mock.calls[0][0].data.generated).toBe(0);

      jest.clearAllMocks();
      for (const found of [null, job({ status: 'completed' }), job({ siteId: 'wine' })]) {
        prisma.imageGenerationJob.findUnique.mockResolvedValue(found);
        await service.complete(prisma as never, completed);
      }
      expect(prisma.media.updateMany).not.toHaveBeenCalled();
      expect(prisma.imageGenerationJob.update).not.toHaveBeenCalled();
    });

    it('failed: every pending row fails with the reason, and the quota gives them back', async () => {
      prisma.imageGenerationJob.findUnique.mockResolvedValue(job());
      await service.fail(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        reason: 'provider_refused',
      });
      expect(prisma.media.updateMany).toHaveBeenCalledWith({
        where: { generationJobId: JOB, status: 'pending' },
        data: { status: 'failed', error: 'provider_refused' },
      });
      expect(prisma.imageGenerationJob.update.mock.calls[0][0].data).toMatchObject({
        status: 'failed',
        generated: 0,
      });
    });
  });
});
