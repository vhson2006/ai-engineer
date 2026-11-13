import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  FACT_SUGGESTION_EVENTS,
  type FactSuggestionRequestedEvent,
  InMemoryObjectStorage,
  OutboxRelay,
  SCRIPT_WRITING_EVENTS,
  SPEECH_EVENTS,
  VIDEO_RENDER_EVENTS,
  type ScriptWritingRequestedEvent,
  type SpeechRequestedEvent,
  type VideoRenderRequestedEvent,
} from '@app/common';
import { site, users } from '../../support/fixtures';
import { mediaProviders, mediaRow } from '../../support/media';
import {
  createPrismaMock,
  outboxPayload,
  outboxSubjects,
  resetPrismaMock,
} from '../../support/prisma-mock';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SitesService } from '../../../src/sites/sites.service';
import { AvatarsService } from '../../../src/studio/avatars.service';
import { BrandKitService } from '../../../src/studio/brand-kit.service';
import { ProjectsService, videoKey } from '../../../src/studio/projects.service';

describe('[projects.service] (unit)', () => {
  let service: ProjectsService;
  const prisma = createPrismaMock();
  let storage: InMemoryObjectStorage;
  const outbox = { poke: jest.fn() };
  const { writer, outsider } = users;
  const ID = '2c9d6f2a-4b1e-4c3d-9a8b-7f6e5d4c3b2a';
  const HERO = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
  const DETAIL = '5b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const JOB = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const script = {
    hooks: ['Chỉ 35.000đ một mẻ?'],
    scenes: [
      { id: 'hook', voice: 'Chỉ 35.000đ một mẻ?', onScreen: '35.000đ/mẻ' },
      { id: 'benefit1', voice: 'Mỗi khách một máy.', onScreen: '1 khách 1 máy' },
      { id: 'cta', voice: 'Gọi cho tiệm nhé!', onScreen: 'Gọi ngay' },
    ],
    caption: 'c',
    hashtags: [],
  };
  const project = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    siteId: 'nails',
    templateId: 'price-hook',
    templateVersion: 1,
    title: 'Giá',
    language: 'vi',
    status: 'draft',
    brief: null,
    inputs: {
      images: { hero: HERO, detail1: DETAIL },
      avatars: {},
      voices: { narrator: 'Puck' },
      facts: { price: 'Giặt sấy 35.000đ/mẻ' },
    },
    script: null,
    warnings: [],
    scriptJobId: null,
    voice: null,
    voiceJobId: null,
    video: null,
    renderId: null,
    error: null,
    createdBy: writer.id,
    updatedBy: writer.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  /** updateManyAndReturn answers the row with the update applied. */
  const applyUpdates = (base: Record<string, unknown>) =>
    prisma.studioProject.updateManyAndReturn.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve([{ ...base, ...data }]),
    );

  beforeEach(async () => {
    jest.resetAllMocks();
    resetPrismaMock(prisma, site);
    prisma.studioBrandKit.findUnique.mockResolvedValue(null);
    prisma.studioAvatar.findMany.mockResolvedValue([]);
    prisma.media.findMany.mockResolvedValue([mediaRow({ id: HERO }), mediaRow({ id: DETAIL })]);
    storage = new InMemoryObjectStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SitesService,
        BrandKitService,
        AvatarsService,
        ProjectsService,
        ...mediaProviders(storage),
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: ConfigService, useValue: { getOrThrow: () => 2 } },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  describe('create', () => {
    it('keeps only the template slots and checks they belong to the site', async () => {
      prisma.media.count.mockResolvedValue(1);
      prisma.studioProject.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => Promise.resolve(project(data)),
      );
      await service.create(
        'nails',
        {
          templateId: 'price-hook',
          title: ' Giá ',
          language: 'vi',
          inputs: {
            images: { hero: HERO, unknownSlot: DETAIL },
            avatars: {},
            voices: { narrator: 'Puck' },
            facts: { price: 'x' },
          },
        },
        writer,
      );
      const [[{ data }]] = prisma.studioProject.create.mock.calls as [
        [{ data: { inputs: object; title: string } }],
      ];
      expect(data.title).toBe('Giá');
      expect(data.inputs).toEqual({
        images: { hero: HERO },
        avatars: {},
        voices: { narrator: 'Puck' },
        facts: { price: 'x' },
      });
    });

    it('refuses an image of another site (422) and a template excluded for the site', async () => {
      prisma.media.count.mockResolvedValue(0);
      const dto = {
        templateId: 'price-hook',
        title: 'x',
        language: 'vi',
        inputs: { images: { hero: HERO }, avatars: {}, voices: {}, facts: {} },
      };
      await expect(service.create('nails', dto, writer)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      prisma.site.findUnique.mockResolvedValue({ ...site, id: 'wine' });
      await expect(service.create('wine', dto, users.admin)).rejects.toThrow(/not available/);
      expect(prisma.studioProject.create).not.toHaveBeenCalled();
    });
  });

  describe('steps', () => {
    it('script: writing + one event with the brand, facts and active scene limits', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(project());
      applyUpdates(project());
      const result = await service.requestScript('nails', ID, writer);

      expect(result.status).toBe('writing');
      expect(outboxSubjects(prisma)).toEqual([SCRIPT_WRITING_EVENTS.REQUESTED]);
      const event = outboxPayload<ScriptWritingRequestedEvent>(prisma);
      expect(event).toMatchObject({
        requester: 'content-service',
        siteId: 'nails',
        language: 'vi',
        brand: { name: site.name },
        facts: [{ id: 'price', text: 'Giặt sấy 35.000đ/mẻ' }],
        hookVariants: 3,
      });
      // detail2 (optional, empty) is left out.
      expect(event.scenes.map((s) => s.id)).toEqual(['hook', 'benefit1', 'cta']);
      expect(outbox.poke).toHaveBeenCalled();
    });

    it('script: 422 without the required fact, 409 while another step runs', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        project({ inputs: { images: {}, avatars: {}, voices: {}, facts: {} } }),
      );
      await expect(service.requestScript('nails', ID, writer)).rejects.toThrow(/fact price/);
      prisma.studioProject.findFirst.mockResolvedValue(project({ status: 'voicing' }));
      await expect(service.requestScript('nails', ID, writer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it("voice: each line with its speaker's voice, under the project's voice prefix", async () => {
      prisma.studioProject.findFirst.mockResolvedValue(project({ status: 'written', script }));
      applyUpdates(project({ status: 'written', script }));
      await service.requestVoice('nails', ID, writer);
      const event = outboxPayload<SpeechRequestedEvent>(prisma);
      expect(outboxSubjects(prisma)).toEqual([SPEECH_EVENTS.REQUESTED]);
      expect(event.keyPrefix).toBe(`studio/nails/${ID}/voice/${event.jobId}/`);
      expect(event.lines).toEqual([
        { id: 'hook', text: 'Chỉ 35.000đ một mẻ?', voice: 'Puck' },
        { id: 'benefit1', text: 'Mỗi khách một máy.', voice: 'Puck' },
        { id: 'cta', text: 'Gọi cho tiệm nhé!', voice: 'Puck' },
      ]);
    });

    it('render: a render row + an event with public URLs; refused over the monthly quota', async () => {
      const voiced = project({
        status: 'voiced',
        script,
        voice: {
          jobId: JOB,
          lines: [
            { id: 'hook', key: `studio/nails/${ID}/voice/${JOB}/hook.wav`, durationMs: 1800 },
          ],
        },
      });
      prisma.studioProject.findFirst.mockResolvedValue(voiced);
      applyUpdates(voiced);
      prisma.studioRender.count.mockResolvedValue(1);
      await service.requestRender('nails', ID, writer);

      expect(prisma.$executeRaw).toHaveBeenCalled(); // per-site lock
      expect(outboxSubjects(prisma)).toEqual([VIDEO_RENDER_EVENTS.REQUESTED]);
      const event = outboxPayload<VideoRenderRequestedEvent>(prisma);
      expect(event.outputKey).toBe(videoKey('nails', ID, event.renderId));
      expect(event.props.scenes[0]).toMatchObject({
        imageUrl: `https://cdn.test/media/nails/${HERO}/1280.webp`,
        voiceUrl: `https://cdn.test/studio/nails/${ID}/voice/${JOB}/hook.wav`,
      });
      expect(prisma.studioRender.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: event.renderId, siteId: 'nails', projectId: ID }),
      });

      jest.clearAllMocks();
      prisma.studioRender.count.mockResolvedValue(2); // quota of 2 used
      await expect(service.requestRender('nails', ID, writer)).rejects.toThrow(/2 videos/);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('a silent brand showcase: no voice step, rendered straight from the script', async () => {
      const showcaseScript = {
        hooks: ['Hi'],
        scenes: ['cover', 'looks', 'promise', 'visit'].map((id) => ({
          id,
          voice: 'Line.',
          onScreen: 'Headline',
        })),
        caption: 'c',
        hashtags: [],
      };
      const written = project({
        templateId: 'brand-showcase',
        status: 'written',
        script: showcaseScript,
        inputs: {
          images: { cover: HERO, look1: HERO, look2: DETAIL },
          avatars: {},
          voices: {},
          facts: { promises: 'Clean | Sterilized tools' },
          narration: false,
        },
      });
      prisma.studioProject.findFirst.mockResolvedValue(written);
      await expect(service.requestVoice('nails', ID, writer)).rejects.toThrow(/no narration/);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();

      applyUpdates(written);
      prisma.studioRender.count.mockResolvedValue(0);
      await service.requestRender('nails', ID, writer);
      const event = outboxPayload<VideoRenderRequestedEvent>(prisma);
      expect(event.composition).toBe('brand-showcase');
      expect(event.props.endCardFrames).toBe(0);
      expect(event.props.scenes.map((s) => [s.id, s.layout, s.voiceUrl])).toEqual([
        ['cover', 'cover', null],
        ['looks', 'grid', null],
        ['promise', 'cards', null],
        ['visit', 'visit', null],
      ]);
    });

    it('keeps no prices for wine (the fact is not offered there)', async () => {
      prisma.site.findUnique.mockResolvedValue({ ...site, id: 'wine' });
      prisma.media.count.mockResolvedValue(1); // one distinct image
      prisma.studioProject.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => Promise.resolve(project(data)),
      );
      await service.create(
        'wine',
        {
          templateId: 'brand-showcase',
          title: 'Showcase',
          language: 'vi',
          inputs: {
            images: { cover: HERO, look1: HERO },
            avatars: {},
            voices: {},
            facts: { promises: 'A | b', prices: 'Rượu | 500.000đ', signature: 'X | 1' },
            narration: true,
          },
        },
        users.admin,
      );
      expect(prisma.studioProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputs: expect.objectContaining({ facts: { promises: 'A | b' }, narration: true }),
        }),
      });
    });

    it("never touches another site's project", async () => {
      await expect(service.requestScript('nails', ID, outsider)).rejects.toThrow(/not found/);
    });
  });

  describe('results', () => {
    it('stores the written script with warnings, only for the job it waits for', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        project({ status: 'writing', scriptJobId: JOB }),
      );
      prisma.site.findUniqueOrThrow.mockResolvedValue(site);
      await service.scriptWritten(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        hooks: ['Giảm 50% hôm nay!'],
        scenes: [{ id: 'hook', voice: 'Giảm 50% hôm nay!', onScreen: '-50%' }],
        caption: '',
        hashtags: [],
        provider: 'fake',
        model: 'fake',
      });
      expect(prisma.studioProject.findFirst).toHaveBeenCalledWith({
        where: { siteId: 'nails', scriptJobId: JOB, status: 'writing' },
      });
      const [[{ data }]] = prisma.studioProject.update.mock.calls as [
        [{ data: { status: string; warnings: { code: string }[] } }],
      ];
      expect(data.status).toBe('written');
      expect(data.warnings.map((w) => w.code)).toEqual(
        expect.arrayContaining(['unknown_number', 'missing_scene']),
      );
    });

    it('a finished render becomes the project video; a failed one returns to voiced', async () => {
      const RENDER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      prisma.studioRender.findFirst.mockResolvedValue({
        id: RENDER,
        siteId: 'nails',
        projectId: ID,
        status: 'pending',
      });
      await service.rendered(prisma as never, {
        renderId: RENDER,
        siteId: 'nails',
        key: videoKey('nails', ID, RENDER),
        sizeBytes: 1000,
        webSizeBytes: 400,
        durationMs: 15000,
        renderMs: 40000,
      });
      expect(prisma.studioProject.updateMany).toHaveBeenCalledWith({
        where: { id: ID, renderId: RENDER, status: 'rendering' },
        data: expect.objectContaining({
          status: 'rendered',
          video: expect.objectContaining({ renderId: RENDER, webSizeBytes: 400 }),
        }),
      });

      jest.clearAllMocks();
      prisma.studioRender.findFirst.mockResolvedValue({
        id: RENDER,
        siteId: 'nails',
        projectId: ID,
        status: 'pending',
      });
      await service.renderFailed(prisma as never, {
        renderId: RENDER,
        siteId: 'nails',
        reason: 'render_failed',
      });
      expect(prisma.studioRender.update).toHaveBeenCalledWith({
        where: { id: RENDER },
        data: expect.objectContaining({ status: 'failed' }),
      });
      expect(prisma.studioProject.updateMany).toHaveBeenCalledWith({
        where: { id: ID, renderId: RENDER, status: 'rendering' },
        data: { status: 'voiced', error: 'render_render_failed' },
      });
    });
  });

  describe('the video', () => {
    const RENDER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const key = videoKey('nails', ID, RENDER);
    const video = (web?: number) => ({
      renderId: RENDER,
      key,
      sizeBytes: 1000,
      ...(web && { webSizeBytes: web }),
      durationMs: 15000,
      renderedAt: '2026-11-12T10:00:00.000Z',
    });

    it('answers the web MP4 and its poster next to the full-quality one (none for older renders)', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        project({ status: 'rendered', video: video(400) }),
      );
      const answered = await service.findOne('nails', ID, writer);
      expect(answered.video).toMatchObject({
        url: `https://cdn.test/${key}`,
        webUrl: `https://cdn.test/studio/nails/${ID}/video/${RENDER}-web.mp4`,
        webSizeBytes: 400,
        posterUrl: `https://cdn.test/studio/nails/${ID}/video/${RENDER}.jpg`,
      });

      prisma.studioProject.findFirst.mockResolvedValue(
        project({ status: 'rendered', video: video() }),
      );
      const older = await service.findOne('nails', ID, writer);
      expect(older.video).toMatchObject({ webUrl: null, webSizeBytes: null, posterUrl: null });
    });

    it('delete: 409 video_in_use while an article shows one of its clips; nothing deleted', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        project({ status: 'rendered', video: video(400) }),
      );
      prisma.articleTranslation.count.mockResolvedValue(2);
      await expect(service.remove('nails', ID, writer)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'video_in_use' }),
      });
      expect(prisma.articleTranslation.count).toHaveBeenCalledWith({
        where: { siteId: 'nails', body: { contains: `/studio/nails/${ID}/` } },
      });
      expect(prisma.studioProject.deleteMany).not.toHaveBeenCalled();
      expect(storage.deleted).toEqual([]);
    });

    it('delete: every render loses its MP4, web MP4 and poster', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        project({ status: 'rendered', video: video(400) }),
      );
      prisma.articleTranslation.count.mockResolvedValue(0);
      prisma.studioRender.findMany.mockResolvedValue([{ id: RENDER }]);
      prisma.studioProject.deleteMany.mockResolvedValue({ count: 1 });
      await service.remove('nails', ID, writer);
      expect(storage.deleted).toEqual([
        `public:${key}`,
        `public:studio/nails/${ID}/video/${RENDER}-web.mp4`,
        `public:studio/nails/${ID}/video/${RENDER}.jpg`,
      ]);
    });
  });

  describe('suggest with AI', () => {
    const kit = {
      siteId: 'nails',
      brandName: 'Envy Nails Spa',
      tagline: null,
      phone: '(919) 366-6435',
      callToAction: null,
      tone: null,
      footerNote: null,
      website: 'envynailsspaofwendell.com',
      address: '2241 Treelight Way\nWendell, NC 27591',
      hours: 'Mon–Sat | 9:30 AM – 7 PM',
      prices: 'Classic manicure | $27',
      bannedPhrases: [],
      primaryColor: '#4db6ac',
      accentColor: '#f48fb1',
      logoMediaId: null,
      logoMedia: null,
      updatedBy: writer.id,
      updatedAt: new Date(),
    };
    const showcase = (overrides: Record<string, unknown> = {}) =>
      project({
        templateId: 'brand-showcase',
        title: 'Fall looks',
        inputs: {
          images: { cover: HERO, look1: HERO, look2: DETAIL },
          avatars: {},
          voices: {},
          facts: {},
        },
        ...overrides,
      });

    beforeEach(() => prisma.studioBrandKit.findUnique.mockResolvedValue(kit));

    it('takes the business facts from the brand kit, asks the AI for the descriptive ones only', async () => {
      const row = showcase();
      prisma.studioProject.findFirst.mockResolvedValue(row);
      applyUpdates(row);
      await service.requestSuggest('nails', ID, writer);

      expect(outboxSubjects(prisma)).toEqual([FACT_SUGGESTION_EVENTS.REQUESTED]);
      const event = outboxPayload<FactSuggestionRequestedEvent>(prisma);
      expect(event.fields.map((f) => f.id)).toEqual(['captions', 'promises']);
      // The looks to name: their smallest size, in the slots' order.
      expect(event.fields[0].images).toEqual([
        `media/nails/${HERO}/640.webp`,
        `media/nails/${DETAIL}/640.webp`,
      ]);
      expect(event.known.map((k) => k.id)).toEqual(['website', 'prices', 'address', 'hours']);
      const data = prisma.studioProject.updateManyAndReturn.mock.calls[0][0].data as {
        status: string;
        inputs: { facts: Record<string, string> };
      };
      expect(data.status).toBe('suggesting');
      expect(data.inputs.facts).toMatchObject({
        website: 'envynailsspaofwendell.com',
        prices: 'Classic manicure | $27',
        hours: 'Mon–Sat | 9:30 AM – 7 PM',
      });
    });

    it('nothing left to draft: saves the brand facts, no AI job', async () => {
      const row = showcase({
        inputs: {
          images: { cover: HERO, look1: HERO },
          avatars: {},
          voices: {},
          facts: { captions: 'Mint', promises: 'Clean | Sterilized tools' },
        },
      });
      prisma.studioProject.findFirst.mockResolvedValue(row);
      applyUpdates(row);
      const answered = await service.requestSuggest('nails', ID, writer);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
      expect(answered.status).toBe('draft');
      expect(answered.inputs.facts.website).toBe('envynailsspaofwendell.com');
    });

    it('fills only empty, suggestable facts and drops lines with invented numbers', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        showcase({
          status: 'suggesting',
          suggestJobId: JOB,
          inputs: {
            images: {},
            avatars: {},
            voices: {},
            facts: { prices: 'Classic manicure | $27', captions: 'Typed by the admin' },
          },
        }),
      );
      prisma.site.findUniqueOrThrow.mockResolvedValue(site);
      await service.suggestionWritten(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        facts: [
          {
            id: 'promises',
            text: 'Clean | Sterilized tools\nExperienced | Over 15 years of nails',
          },
          { id: 'captions', text: 'Mint foil' },
          { id: 'prices', text: 'Gel | $5' },
        ],
        provider: 'fake',
        model: 'fake',
      });
      expect(prisma.studioProject.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: {
          inputs: expect.objectContaining({
            facts: {
              prices: 'Classic manicure | $27',
              captions: 'Typed by the admin',
              promises: 'Clean | Sterilized tools',
            },
            suggested: ['promises'],
          }),
          status: 'draft',
          suggestJobId: null,
          error: null,
        },
      });
    });

    it('a failed suggestion returns the project to where it was, with the reason', async () => {
      prisma.studioProject.findFirst.mockResolvedValue(
        showcase({ status: 'suggesting', suggestJobId: JOB, script }),
      );
      await service.suggestionFailed(prisma as never, {
        jobId: JOB,
        requester: 'content-service',
        siteId: 'nails',
        reason: 'provider_refused',
      });
      expect(prisma.studioProject.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: { status: 'written', suggestJobId: null, error: 'suggest_provider_refused' },
      });
    });

    it('an AI draft the admin edits is theirs (no longer marked)', async () => {
      const row = showcase({
        status: 'draft',
        inputs: {
          images: { cover: HERO, look1: HERO },
          avatars: {},
          voices: {},
          facts: { captions: 'Mint foil', promises: 'Clean | Sterilized tools' },
          suggested: ['captions', 'promises'],
        },
      });
      prisma.studioProject.findFirst.mockResolvedValue(row);
      prisma.media.count.mockResolvedValue(1);
      applyUpdates(row);
      const answered = await service.update(
        'nails',
        ID,
        {
          inputs: {
            images: { cover: HERO, look1: HERO },
            avatars: {},
            voices: {},
            facts: { captions: 'Mint foil', promises: 'Clean | Tools sterilized for every guest' },
            suggested: ['promises'],
          } as never,
        },
        writer,
      );
      expect(answered.inputs.suggested).toEqual(['captions']);
    });

    it('a new project takes the business facts from the brand kit', async () => {
      prisma.media.count.mockResolvedValue(1);
      prisma.studioProject.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => Promise.resolve(project(data)),
      );
      await service.create(
        'nails',
        {
          templateId: 'brand-showcase',
          title: 'Fall looks',
          language: 'en',
          inputs: { images: { cover: HERO, look1: HERO }, avatars: {}, voices: {}, facts: {} },
        },
        writer,
      );
      expect(prisma.studioProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputs: expect.objectContaining({
            facts: expect.objectContaining({ address: '2241 Treelight Way\nWendell, NC 27591' }),
          }),
        }),
      });
    });
  });
});
