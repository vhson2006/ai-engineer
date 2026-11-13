import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ARTICLE_PROMPT_EVENTS,
  IMAGE_GENERATION_EVENTS,
  OutboxRelay,
  TRANSLATION_EVENTS,
  type ArticlePromptRequestedEvent,
  type ArticleWritingRequestedEvent,
  type TranslationRequestedEvent,
  type WrittenArticle,
} from '@app/common';
import { site, users } from '../../support/fixtures';
import { mediaProviders, mediaRow } from '../../support/media';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { ArticleDraftsService } from '../../../src/article-drafts/article-drafts.service';
import { ArticlesService } from '../../../src/articles/articles.service';
import { MediaGenerationService } from '../../../src/media/media-generation.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { BrandKitService } from '../../../src/studio/brand-kit.service';
import { TranslationJobsService } from '../../../src/translations/translation-jobs.service';

describe('[article-drafts.service] (unit)', () => {
  let service: ArticleDraftsService;
  const prisma = createPrismaMock();
  const outbox = { poke: jest.fn() };
  const { writer } = users;
  const ID = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const CATEGORY = '9d3c1f2e-5a4b-4c6d-8e7f-1a2b3c4d5e6f';
  const IMAGE_JOB = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const COVER = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
  const idea = { topic: 'Care', idea: 'Gel that lasts', length: 'medium', images: 0 };
  const job = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    siteId: 'nails',
    categoryId: CATEGORY,
    locale: 'en',
    idea,
    status: 'prompting',
    prompt: null,
    outline: null,
    result: null,
    imageJobIds: [],
    articleId: null,
    warnings: null,
    error: null,
    detail: null,
    provider: null,
    model: null,
    writtenAt: null,
    createdBy: writer.id,
    updatedBy: writer.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...overrides,
  });
  const kit = {
    siteId: 'nails',
    brandName: 'Envy Nails Spa',
    tagline: null,
    phone: '(919) 366-6435',
    callToAction: 'Book online',
    tone: 'friendly',
    footerNote: null,
    website: null,
    address: '2241 Treelight Way',
    hours: 'Mon–Sat | 9:30 AM – 7 PM',
    prices: 'Gel manicure | $35',
    bannedPhrases: ['cheapest'],
    primaryColor: '#4db6ac',
    accentColor: '#f48fb1',
    logoMediaId: null,
    logoMedia: null,
    updatedBy: writer.id,
    updatedAt: new Date(),
  };
  const article: WrittenArticle = {
    title: 'Gel nails that last',
    excerpt: 'How to keep a gel manicure longer.',
    coverPrompt: 'Close-up of glossy gel nails',
    coverAlt: 'Glossy gel nails',
    blocks: [
      { type: 'lead', text: 'Gel from $35, and over 15 years of care.' },
      { type: 'heading', text: 'Prep' },
      { type: 'image', prompt: 'Nail prep', alt: 'Prep', caption: 'Prep' },
      { type: 'cta', title: 'Book', text: 'Call us.' },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    prisma.studioBrandKit.findUnique.mockResolvedValue(kit);
    prisma.site.findUniqueOrThrow.mockResolvedValue(site);
    prisma.articleTranslation.findMany.mockResolvedValue([{ title: 'Old article' }]);
    prisma.articleDraftJob.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve(job(data as Record<string, unknown>)),
    );
    prisma.articleDraftJob.update.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve(job(data as Record<string, unknown>)),
    );
    prisma.article.create.mockResolvedValue({ id: 'art-1' });
    prisma.articleTranslation.findUnique.mockResolvedValue(null);
    prisma.translationJob.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 'tj-1', ...data }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticleDraftsService,
        SitesService,
        BrandKitService,
        ...mediaProviders(),
        MediaGenerationService,
        TranslationJobsService,
        { provide: ArticlesService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: ConfigService, useValue: { getOrThrow: () => 2 } },
      ],
    }).compile();
    service = moduleRef.get(ArticleDraftsService);
  });

  it('starts with the brief: topic, idea, business facts, existing titles; 422 for another category', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: CATEGORY,
      key: 'care',
      translations: [{ locale: 'en', name: 'Nail care' }],
    });
    const created = await service.create(
      'nails',
      { categoryId: CATEGORY, locale: 'en', idea: ' Gel that lasts ', length: 'medium', images: 2 },
      writer,
    );
    expect(created.status).toBe('prompting');
    expect(outboxSubjects(prisma)).toEqual([ARTICLE_PROMPT_EVENTS.REQUESTED]);
    const event = outboxPayload<ArticlePromptRequestedEvent>(prisma);
    expect(event.idea).toEqual({
      topic: 'Nail care',
      idea: 'Gel that lasts',
      length: 'medium',
      images: 2,
    });
    expect(event.facts.map((f) => f.id)).toEqual(['phone', 'address', 'hours', 'prices']);
    expect(event.existingTitles).toEqual(['Old article']);
    expect(event.bannedPhrases).toEqual(['cheapest']);

    prisma.category.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        'nails',
        { categoryId: CATEGORY, locale: 'en', idea: 'x x x', length: 'short', images: 0 },
        writer,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('writes from the confirmed brief, counted in the monthly quota; 409 while not ready', async () => {
    prisma.articleDraftJob.findFirst.mockResolvedValue(
      job({ status: 'prompted', prompt: 'p', outline: ['A'] }),
    );
    prisma.articleDraftJob.count.mockResolvedValue(0);
    prisma.articleDraftJob.updateManyAndReturn.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve([job(data as Record<string, unknown>)]),
    );
    const brief =
      'You are a professional content writer for Envy Nails Spa. Write about gel nails.';
    const answered = await service.write(
      'nails',
      ID,
      { prompt: brief, outline: [' Prep ', 'Care'] },
      writer,
    );
    expect(answered.status).toBe('writing');
    const event = outboxPayload<ArticleWritingRequestedEvent>(prisma);
    expect(event).toMatchObject({
      prompt: brief,
      outline: ['Prep', 'Care'],
      length: 'medium',
      images: 0,
    });
    expect(prisma.$executeRaw).toHaveBeenCalled(); // per-site lock for the quota

    prisma.articleDraftJob.count.mockResolvedValue(2); // quota of 2 used
    await expect(
      service.write('nails', ID, { prompt: brief, outline: ['A'] }, writer),
    ).rejects.toThrow(/2 AI articles/);

    prisma.articleDraftJob.findFirst.mockResolvedValue(job({ status: 'writing' }));
    await expect(
      service.write('nails', ID, { prompt: brief, outline: ['A'] }, writer),
    ).rejects.toThrow(ConflictException);
  });

  it('without images: the draft article at once (sanitized blocks), numbers to check, a translation job per other language', async () => {
    prisma.articleDraftJob.findFirst.mockResolvedValue(
      job({ status: 'writing', prompt: 'brief', outline: ['Prep'] }),
    );
    await service.articleWritten(prisma as never, {
      jobId: ID,
      requester: 'content-service',
      siteId: 'nails',
      article,
      provider: 'fake',
      model: 'fake',
    });
    expect(prisma.article.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ siteId: 'nails', categoryId: CATEGORY, coverMediaId: null }),
    });
    const [translation] = (
      prisma.articleTranslation.createMany.mock.calls[0][0] as {
        data: { body: string; slug: string; locale: string }[];
      }
    ).data;
    expect(translation).toMatchObject({ locale: 'en', slug: 'gel-nails-that-last' });
    expect(translation.body).toContain('<p class="tpl-lead">');
    expect(translation.body).not.toContain('<figure'); // no image made: left out
    // The site's other language (vi) is machine-translated from the new draft (ADR 0036).
    expect(outboxSubjects(prisma)).toEqual([TRANSLATION_EVENTS.REQUESTED]);
    expect(prisma.translationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        articleId: 'art-1',
        sourceLocale: 'en',
        targetLocale: 'vi',
        overwrite: false,
        createdBy: writer.id,
      }),
    });
    const request = outboxPayload<TranslationRequestedEvent>(prisma);
    expect(request).toMatchObject({ kind: 'article', sourceLocale: 'en', targetLocale: 'vi' });
    expect(request.segments).toContain('Gel nails that last');
    expect(request.glossary).toEqual([{ source: 'Envy Nails Spa', target: 'Envy Nails Spa' }]);
    expect(prisma.articleDraftJob.update).toHaveBeenLastCalledWith({
      where: { id: ID },
      data: expect.objectContaining({ status: 'completed', articleId: 'art-1', warnings: ['15'] }),
    });
  });

  it('with images: asks for the cover then the text images, builds once all are settled', async () => {
    const idea2 = { ...idea, images: 2 };
    prisma.articleDraftJob.findFirst.mockResolvedValue(job({ status: 'writing', idea: idea2 }));
    prisma.imageGenerationJob.findMany.mockResolvedValue([]);
    await service.articleWritten(prisma as never, {
      jobId: ID,
      requester: 'content-service',
      siteId: 'nails',
      article,
      provider: 'fake',
      model: 'fake',
    });
    expect(outboxSubjects(prisma)).toEqual([
      IMAGE_GENERATION_EVENTS.REQUESTED,
      IMAGE_GENERATION_EVENTS.REQUESTED,
    ]);
    expect(outboxPayload<{ prompt: string }>(prisma, 0).prompt).toBe(
      'Close-up of glossy gel nails',
    );
    expect(prisma.article.create).not.toHaveBeenCalled();
    const imageJobIds = (
      prisma.articleDraftJob.update.mock.calls[0][0] as {
        data: { imageJobIds: string[]; status: string };
      }
    ).data;
    expect(imageJobIds.status).toBe('illustrating');

    // One image still pending: nothing yet; both settled: the article, with its cover.
    prisma.articleDraftJob.findFirst.mockResolvedValue(
      job({
        status: 'illustrating',
        idea: idea2,
        result: article,
        imageJobIds: [IMAGE_JOB, 'other'],
        warnings: [],
      }),
    );
    prisma.imageGenerationJob.count.mockResolvedValue(1);
    await service.imageSettled(prisma as never, IMAGE_JOB);
    expect(prisma.article.create).not.toHaveBeenCalled();

    prisma.imageGenerationJob.count.mockResolvedValue(0);
    prisma.media.findMany.mockResolvedValue([mediaRow({ id: COVER, generationJobId: IMAGE_JOB })]);
    await service.imageSettled(prisma as never, IMAGE_JOB);
    expect(prisma.article.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ coverMediaId: COVER }),
    });
    expect(prisma.articleDraftJob.update).toHaveBeenLastCalledWith({
      where: { id: ID },
      data: expect.objectContaining({ status: 'completed', warnings: ['images_failed'] }),
    });
  });
});
