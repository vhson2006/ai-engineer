import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ARTICLE_EVENTS, ArticlePublishedEvent, OutboxRelay } from '@app/common';
import {
  ARTICLE_ID as id,
  articleRow as row,
  site,
  translationRow as tr,
  users,
} from '../../support/fixtures';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { ArticlePublishingService } from '../../../src/articles/article-publishing.service';
import { ArticlesService } from '../../../src/articles/articles.service';

describe('[article-publishing.service] (unit)', () => {
  let service: ArticlePublishingService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const { publisher, outsider } = users;
  const now = new Date('2026-11-10T08:00:00Z');

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticlePublishingService,
        ArticlesService,
        SitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
      ],
    }).compile();
    service = moduleRef.get(ArticlePublishingService);
  });

  describe('publish', () => {
    it('applies the site rule first (404)', async () => {
      await expect(service.publish('nails', id, {}, outsider, now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('needs every language of the site (422), nothing written', async () => {
      prisma.article.findFirst.mockResolvedValue(row({ translations: [tr('en')] }));
      await expect(service.publish('nails', id, {}, publisher, now)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(prisma.article.updateMany).not.toHaveBeenCalled();
    });

    it('publishes now with a PUBLISHED event in the same transaction', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      prisma.article.updateMany.mockResolvedValue({ count: 1 });
      prisma.article.findUniqueOrThrow.mockResolvedValue(
        row({ status: 'published', publishedAt: now }),
      );

      const result = await service.publish('nails', id, {}, publisher, now);

      expect(result.status).toBe('published');
      expect(prisma.article.updateMany).toHaveBeenCalledWith({
        where: { id, siteId: 'nails' },
        data: expect.objectContaining({ status: 'published', publishedAt: now, scheduledAt: null }),
      });
      expect(outboxSubjects(prisma)).toEqual([ARTICLE_EVENTS.PUBLISHED]);
      const payload = outboxPayload<ArticlePublishedEvent>(prisma);
      expect(payload).toMatchObject({ id, siteId: 'nails', actorId: publisher.id });
      expect(payload.translations.map((t) => t.locale)).toEqual(['en', 'vi']);
      expect(outbox.poke).toHaveBeenCalled();
    });

    it('schedules a future time without an event; a time within a minute publishes now', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      prisma.article.updateMany.mockResolvedValue({ count: 1 });
      const at = '2026-11-17T01:00:00Z';
      prisma.article.findUniqueOrThrow.mockResolvedValue(
        row({ status: 'scheduled', scheduledAt: new Date(at) }),
      );

      await service.publish('nails', id, { at }, publisher, now);
      expect(prisma.article.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'scheduled', scheduledAt: new Date(at) }),
        }),
      );
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();

      prisma.article.findUniqueOrThrow.mockResolvedValue(
        row({ status: 'published', publishedAt: now }),
      );
      await service.publish('nails', id, { at: '2026-11-10T08:00:30Z' }, publisher, now);
      expect(prisma.article.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'published' }) }),
      );
    });

    it('refuses to schedule a live article (409); publishing it again changes nothing', async () => {
      prisma.article.findFirst.mockResolvedValue(row({ status: 'published', publishedAt: now }));
      await expect(
        service.publish('nails', id, { at: '2026-12-01T00:00:00Z' }, publisher, now),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.publish('nails', id, {}, publisher, now)).resolves.toMatchObject({
        status: 'published',
      });
      expect(prisma.article.updateMany).not.toHaveBeenCalled();
    });

    it('answers 404 when the article was deleted in between, without an event', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      prisma.article.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.publish('nails', id, {}, publisher, now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('unpublish', () => {
    it('takes a live article off the site with an UNPUBLISHED event', async () => {
      prisma.article.findFirst.mockResolvedValue(
        row({ status: 'published', publishedAt: new Date() }),
      );
      prisma.article.updateMany.mockResolvedValue({ count: 1 });
      prisma.article.findUniqueOrThrow.mockResolvedValue(row());

      await service.unpublish('nails', id, publisher);

      expect(prisma.article.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft', publishedAt: null, scheduledAt: null }),
        }),
      );
      expect(outboxSubjects(prisma)).toEqual([ARTICLE_EVENTS.UNPUBLISHED]);
    });

    it('cancels a schedule without an event; a draft stays as it is', async () => {
      prisma.article.findFirst.mockResolvedValue(
        row({ status: 'scheduled', scheduledAt: new Date('2026-12-01T00:00:00Z') }),
      );
      prisma.article.updateMany.mockResolvedValue({ count: 1 });
      prisma.article.findUniqueOrThrow.mockResolvedValue(row());
      await service.unpublish('nails', id, publisher);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();

      prisma.article.updateMany.mockClear();
      prisma.article.findFirst.mockResolvedValue(row());
      await service.unpublish('nails', id, publisher);
      expect(prisma.article.updateMany).not.toHaveBeenCalled();
    });
  });
});
