import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OutboxRelay, TRANSLATION_EVENTS } from '@app/common';
import {
  ARTICLE_ID as articleId,
  articleRow as row,
  site,
  translationRow as tr,
  users,
} from '../../support/fixtures';
import { mediaProviders } from '../../support/media';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { ArticlesService } from '../../../src/articles/articles.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { TranslationJobsService } from '../../../src/translations/translation-jobs.service';

describe('[translation-jobs.service] (unit)', () => {
  let service: TranslationJobsService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const { writer, outsider } = users;
  const JOB = '5b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const viOnly = () => row({ translations: [{ ...tr('vi'), body: '<p>Xin chào</p>' }] });
  const job = (overrides: Record<string, unknown> = {}) => ({
    id: JOB,
    siteId: 'nails',
    articleId,
    sourceLocale: 'vi',
    targetLocale: 'en',
    overwrite: false,
    status: 'pending',
    source: {
      title: 'Tiêu đề',
      excerpt: 'Tóm tắt',
      body: '<p class="tpl-lead">Giá <strong>35.000 ₫</strong></p>',
    },
    error: null,
    detail: null,
    warnings: null,
    provider: null,
    model: null,
    createdBy: writer.id,
    createdAt: new Date('2026-11-12T03:00:00Z'),
    completedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    const moduleRef = await Test.createTestingModule({
      providers: [
        TranslationJobsService,
        ArticlesService,
        SitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        ...mediaProviders(),
      ],
    }).compile();
    service = moduleRef.get(TranslationJobsService);
  });

  describe('start', () => {
    it('stores the job with a source snapshot and asks ai-service (outbox, same transaction)', async () => {
      prisma.article.findFirst.mockResolvedValue(viOnly());
      prisma.translationJob.findFirst.mockResolvedValue(null);
      prisma.translationJob.create.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve(job(data as Record<string, unknown>)),
      );

      const result = await service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, writer);

      expect(result).toMatchObject({ status: 'pending', sourceLocale: 'vi', targetLocale: 'en' });
      expect(outboxSubjects(prisma)).toEqual([TRANSLATION_EVENTS.REQUESTED]);
      expect(outboxPayload(prisma)).toMatchObject({
        requester: 'content-service',
        siteId: 'nails',
        sourceLocale: 'vi',
        targetLocale: 'en',
        kind: 'article',
        segments: ['Title vi', 'Excerpt', 'Xin chào'],
        glossary: [{ source: site.name, target: site.name }],
      });
      expect(outbox.poke).toHaveBeenCalled();
    });

    it('refuses a live article (409), a missing source (422) and an existing target without overwrite (409)', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(
        row({ status: 'published', publishedAt: new Date() }),
      );
      await expect(
        service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, writer),
      ).rejects.toMatchObject({
        response: { code: 'not_a_draft' },
      });
      prisma.article.findFirst.mockResolvedValueOnce(row({ translations: [tr('en')] }));
      await expect(
        service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, writer),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      prisma.article.findFirst.mockResolvedValueOnce(row());
      await expect(
        service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, writer),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.translationJob.create).not.toHaveBeenCalled();
    });

    it('refuses the same language, a language of no site, and a site the caller does not manage', async () => {
      await expect(
        service.start('nails', articleId, 'vi', { sourceLocale: 'vi' }, writer),
      ).rejects.toMatchObject({
        response: { code: 'invalid_locale' },
      });
      await expect(
        service.start('nails', articleId, 'fr', { sourceLocale: 'vi' }, writer),
      ).rejects.toMatchObject({
        response: { code: 'invalid_locale' },
      });
      await expect(
        service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, outsider),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reuses a pending job instead of asking twice (double click)', async () => {
      prisma.article.findFirst.mockResolvedValue(viOnly());
      prisma.translationJob.findFirst.mockResolvedValue(job());
      await expect(
        service.start('nails', articleId, 'en', { sourceLocale: 'vi' }, writer),
      ).resolves.toMatchObject({
        id: JOB,
      });
      expect(prisma.translationJob.create).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    beforeEach(() => {
      prisma.translationJob.findFirst.mockResolvedValue(job());
      prisma.article.findFirst.mockResolvedValue(viOnly());
      prisma.articleTranslation.findUnique.mockResolvedValue(null);
    });

    it('puts the translation back into the structure, sanitized, as a draft translation, and flags what to review', async () => {
      await service.complete(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        targetLocale: 'en',
        segments: ['Price list', 'Summary', 'Price <strong>35,000 ₫</strong><script>x</script>'],
        provider: 'gemini',
        model: 'gemini-3.8-flash',
      });

      expect(prisma.articleTranslation.deleteMany).toHaveBeenCalledWith({
        where: { articleId, locale: 'en' },
      });
      const [created] = prisma.articleTranslation.createMany.mock.calls[0][0].data;
      expect(created).toMatchObject({
        locale: 'en',
        title: 'Price list',
        slug: 'price-list',
        excerpt: 'Summary',
        body: '<p class="tpl-lead">Price <strong>35,000 ₫</strong></p>',
      });
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: articleId },
        data: { updatedBy: writer.id },
      });
      expect(prisma.translationJob.update).toHaveBeenCalledWith({
        where: { id: JOB },
        data: expect.objectContaining({
          status: 'completed',
          provider: 'gemini',
          warnings: [{ kind: 'numbers', text: 'Price 35,000 ₫x' }],
        }),
      });
    });

    it('a slug used by another article gets a suffix', async () => {
      prisma.articleTranslation.findUnique
        .mockResolvedValueOnce({ articleId: 'other' })
        .mockResolvedValueOnce(null);
      await service.complete(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        targetLocale: 'en',
        segments: ['Price list', 'Summary', 'Price <strong>35.000 ₫</strong>'],
        provider: 'fake',
        model: 'fake',
      });
      expect(prisma.articleTranslation.createMany.mock.calls[0][0].data[0].slug).toBe(
        'price-list-2',
      );
    });

    it('fails the job, writing nothing, when the article was published meanwhile or the answer does not fit', async () => {
      prisma.article.findFirst.mockResolvedValueOnce(
        row({ status: 'published', publishedAt: new Date() }),
      );
      const event = {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        targetLocale: 'en',
        segments: ['only one'],
        provider: 'fake',
        model: 'fake',
      };
      await service.complete(prisma as never, event);
      expect(prisma.translationJob.update).toHaveBeenLastCalledWith({
        where: { id: JOB },
        data: expect.objectContaining({ status: 'failed', error: 'article_not_draft' }),
      });
      await service.complete(prisma as never, event);
      expect(prisma.translationJob.update).toHaveBeenLastCalledWith({
        where: { id: JOB },
        data: expect.objectContaining({ status: 'failed', error: 'invalid_output' }),
      });
      expect(prisma.articleTranslation.createMany).not.toHaveBeenCalled();
    });

    it('ignores a job that is no longer pending (late duplicate)', async () => {
      prisma.translationJob.findFirst.mockResolvedValue(null);
      await service.fail(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        reason: 'provider_unavailable',
      });
      expect(prisma.translationJob.update).not.toHaveBeenCalled();
    });
  });
});
