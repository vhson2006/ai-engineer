import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ARTICLE_EVENTS, OutboxRelay } from '@app/common';
import {
  ARTICLE_ID as id,
  articleRow as row,
  CATEGORY_ID as categoryId,
  site,
  translationInput,
  translationRow as tr,
  users,
} from '../../support/fixtures';
import { createPrismaMock, outboxSubjects, resetPrismaMock } from '../../support/prisma-mock';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { ArticlesService } from '../../../src/articles/articles.service';

describe('[articles.service] (unit)', () => {
  let service: ArticlesService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const { writer, publisher, outsider, admin } = users;

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticlesService,
        SitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
      ],
    }).compile();
    service = moduleRef.get(ArticlesService);
  });

  describe('site rule', () => {
    it('answers 404 for a site the caller does not belong to, without reading it', async () => {
      await expect(service.findOne('nails', id, outsider)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.site.findUnique).not.toHaveBeenCalled();
    });

    it('lets content:admin into any site', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      await expect(service.findOne('nails', id, admin)).resolves.toMatchObject({ id });
    });

    it('answers 404 for an article of another site (queried by site, not only by id)', async () => {
      prisma.article.findFirst.mockResolvedValue(null);
      await expect(service.findOne('nails', id, writer)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id, siteId: 'nails' } }),
      );
    });
  });

  describe('create', () => {
    it('creates a draft with a reading time, and frees slugs taken back from redirects', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: categoryId });
      prisma.article.create.mockResolvedValue({ id });
      prisma.article.findUniqueOrThrow.mockResolvedValue(row({ translations: [tr('en')] }));

      const result = await service.create(
        'nails',
        { categoryId, translations: [translationInput('en')] },
        writer,
      );

      expect(result.status).toBe('draft');
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          siteId: 'nails',
          createdBy: writer.id,
          updatedBy: writer.id,
        }),
      });
      expect(prisma.articleTranslation.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ locale: 'en', siteId: 'nails', readingMinutes: 1 })],
      });
      expect(prisma.articleSlugRedirect.deleteMany).toHaveBeenCalledWith({
        where: { siteId: 'nails', OR: [{ locale: 'en', slug: 'slug-en' }] },
      });
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled(); // a draft is not an event
    });

    it('refuses a category of another site (422) and a language the site lacks (400)', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(
        service.create('nails', { categoryId, translations: [translationInput('en')] }, writer),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(
        service.create('nails', { categoryId, translations: [translationInput('fr')] }, writer),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.article.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('only content:publish changes a live article (403), nothing written', async () => {
      prisma.article.findFirst.mockResolvedValue(
        row({ status: 'published', publishedAt: new Date() }),
      );
      await expect(service.update('nails', id, { featured: true }, writer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.article.updateMany).not.toHaveBeenCalled();
    });

    it('keeps the old slug of a live article as a redirect and announces the change', async () => {
      const publishedAt = new Date('2026-11-02T00:00:00Z');
      prisma.article.findFirst.mockResolvedValue(row({ status: 'published', publishedAt }));
      prisma.article.updateMany.mockResolvedValue({ count: 1 });
      prisma.article.findUniqueOrThrow.mockResolvedValue(
        row({ status: 'published', publishedAt, translations: [tr('en', 'new-en'), tr('vi')] }),
      );

      await service.update(
        'nails',
        id,
        { translations: [translationInput('en', 'new-en'), translationInput('vi')] },
        publisher,
      );

      expect(prisma.article.updateMany).toHaveBeenCalledWith({
        where: { id, siteId: 'nails' },
        data: expect.objectContaining({ updatedBy: publisher.id }),
      });
      expect(prisma.articleSlugRedirect.createMany).toHaveBeenCalledWith({
        data: [{ siteId: 'nails', locale: 'en', slug: 'slug-en', articleId: id }],
        skipDuplicates: true,
      });
      expect(outboxSubjects(prisma)).toEqual([ARTICLE_EVENTS.UPDATED]);
      expect(outbox.poke).toHaveBeenCalled();
    });

    it('refuses to drop a language of a live article (422)', async () => {
      prisma.article.findFirst.mockResolvedValue(
        row({ status: 'published', publishedAt: new Date() }),
      );
      await expect(
        service.update('nails', id, { translations: [translationInput('en')] }, publisher),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('answers 404 when the article was deleted in between, without an event', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      prisma.article.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.update('nails', id, { featured: true }, writer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a draft without an event', async () => {
      prisma.article.findFirst.mockResolvedValue(row());
      prisma.article.deleteMany.mockResolvedValue({ count: 1 });
      await service.remove('nails', id, writer);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('a live article: content:publish only, and an UNPUBLISHED event', async () => {
      prisma.article.findFirst.mockResolvedValue(
        row({ status: 'published', publishedAt: new Date() }),
      );
      prisma.article.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.remove('nails', id, writer)).rejects.toBeInstanceOf(ForbiddenException);
      await service.remove('nails', id, publisher);
      expect(outboxSubjects(prisma)).toEqual([ARTICLE_EVENTS.UNPUBLISHED]);
    });
  });
});
