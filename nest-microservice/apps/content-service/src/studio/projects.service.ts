import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  addToOutbox,
  AuthUser,
  CreateStudioProjectDto,
  ListStudioProjectsQueryDto,
  OBJECT_STORAGE,
  OutboxRelay,
  paginate,
  Paginated,
  FACT_SUGGESTION_EVENTS,
  SCRIPT_WRITING_EVENTS,
  SPEECH_EVENTS,
  STUDIO_VOICE_IDS,
  studioTemplate,
  UpdateStudioProjectDto,
  VIDEO_RENDER_EVENTS,
  videoWebKeys,
  type FactSuggestionCompletedEvent,
  type MediaContentType,
  type FactSuggestionFailedEvent,
  type FactSuggestionRequestedEvent,
  type ObjectStorage,
  type ScriptWritingCompletedEvent,
  type ScriptWritingFailedEvent,
  type ScriptWritingRequestedEvent,
  type SpeechCompletedEvent,
  type SpeechFailedEvent,
  type SpeechRequestedEvent,
  type StudioBrandKitResponse,
  type StudioCompositionProps,
  type StudioInputs,
  type StudioProjectResponse,
  type StudioProjectStatus,
  type StudioProjectSummary,
  type StudioScript,
  type StudioTemplate,
  type StudioVideo,
  type VideoRenderCompletedEvent,
  type VideoRenderFailedEvent,
  type VideoRenderRequestedEvent,
} from '@app/common';
import { Prisma, type Site, type StudioProject } from '../generated/prisma/client';
import { REQUESTER } from '../common/ai';
import { monthStart } from '../media/media-generation.service';
import { MediaUrls, variantsOf } from '../media/media-urls';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { AvatarsService } from './avatars.service';
import { BrandKitService } from './brand-kit.service';
import { buildCompositionProps, type ResolvedAssets } from './composition';
import { activeScenes, checkScript, narrated, numbersIn } from './script-checks';

type Tx = Prisma.TransactionClient;

/** What `studio_projects.voice` and `.video` hold (JSON columns, written only here). */
interface StoredVoice {
  jobId: string;
  lines: { id: string; key: string; durationMs: number }[];
}
interface StoredVideo {
  renderId: string;
  key: string;
  sizeBytes: number;
  /** The web MP4 + poster (videoWebKeys(key)) exist; absent for renders without them. */
  webSizeBytes?: number;
  durationMs: number;
  renderedAt: string;
}

const BUSY: StudioProjectStatus[] = ['suggesting', 'writing', 'voicing', 'rendering'];
/** What the AI sees of an already filled fact (context, not material). */
const KNOWN_FACT_MAX = 2000;
const DEFAULT_VOICE = 'Kore';
/** An article as a fact: its title and text, without markup. */
const ARTICLE_FACT_MAX = 12_000;

/**
 * Video projects of the studio (ADR 0039): a template, the admin's inputs, then three steps that
 * each go through the outbox to another process and come back as an event (StudioResults):
 *
 *   script → ai-service writes the lines (events.script-writing.*)
 *   voice  → ai-service speaks them into the public bucket (events.speech.*)
 *   render → render-worker makes the MP4 (events.video-render.*)
 *
 * A project is never changed while a step runs (409 `busy`). Every input is checked to belong to
 * the project's site, whatever the request says.
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly rendersPerMonth: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: SitesService,
    private readonly brand: BrandKitService,
    private readonly avatars: AvatarsService,
    private readonly urls: MediaUrls,
    private readonly outbox: OutboxRelay,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    config: ConfigService,
  ) {
    this.rendersPerMonth = config.getOrThrow<number>('CONTENT_STUDIO_RENDERS_PER_MONTH');
  }

  /* ─────────────────────────────── CRUD ─────────────────────────────── */

  async findAll(
    siteId: string,
    query: ListStudioProjectsQueryDto,
    user: AuthUser,
  ): Promise<Paginated<StudioProjectSummary>> {
    await this.sites.getAccessible(siteId, user);
    const where: Prisma.StudioProjectWhereInput = {
      siteId,
      ...(query.rendered === 'true' && { video: { not: Prisma.DbNull } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.studioProject.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.studioProject.count({ where }),
    ]);
    return paginate(
      rows.map((row) => this.toSummary(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(siteId: string, id: string, user: AuthUser): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    return this.toResponse(site, await this.getOrFail(siteId, id));
  }

  async create(
    siteId: string,
    dto: CreateStudioProjectDto,
    user: AuthUser,
  ): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const template = this.templateFor(site, dto.templateId);
    if (!site.locales.includes(dto.language)) {
      throw new UnprocessableEntityException({
        message: `The site has no language ${dto.language}`,
        code: 'invalid_language',
      });
    }
    const inputs = withBrandFacts(
      template,
      site,
      await this.checkInputs(site, template, dto.inputs),
      await this.brand.resolve(site),
    );
    const row = await this.prisma.studioProject.create({
      data: {
        siteId,
        templateId: template.id,
        templateVersion: template.version,
        title: dto.title.trim(),
        language: dto.language,
        brief: dto.brief?.trim() || null,
        inputs: inputs as unknown as Prisma.InputJsonValue,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
    return this.toResponse(site, row);
  }

  /**
   * Title, brief, inputs, or the admin's edit of the script. A new script (or other voices) makes
   * the voice obsolete: it is cleared and its files deleted, the project is back to `written`.
   */
  async update(
    siteId: string,
    id: string,
    dto: UpdateStudioProjectDto,
    user: AuthUser,
  ): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const current = await this.getOrFail(siteId, id);
    assertIdle(current);
    const template = this.templateOf(current);
    const before = currentInputs(current);
    const inputs = dto.inputs
      ? keepUneditedDrafts(await this.checkInputs(site, template, dto.inputs), before)
      : before;
    let script = current.script as unknown as StudioScript | null;
    if (dto.script) {
      const allowed = new Set(template.scenes.map((s) => s.id));
      const unknown = dto.script.scenes.find((s) => !allowed.has(s.id));
      if (unknown) {
        throw new UnprocessableEntityException({
          message: `The template has no scene ${unknown.id}`,
          code: 'invalid_script',
        });
      }
      script = {
        hooks: dto.script.hooks.map((h) => h.trim()),
        scenes: dto.script.scenes.map((s) => ({
          id: s.id,
          voice: s.voice.trim(),
          onScreen: s.onScreen.trim(),
        })),
        caption: dto.script.caption.trim(),
        hashtags: dto.script.hashtags.map((h) => h.trim()).filter(Boolean),
      };
    }
    const voiceChanged =
      Boolean(dto.script) ||
      (dto.inputs &&
        (JSON.stringify(inputs.voices) !== JSON.stringify(before.voices) ||
          narrated(template, inputs) !== narrated(template, before)));
    const oldVoice = voiceChanged ? (current.voice as unknown as StoredVoice | null) : null;
    const warnings = script ? await this.warningsFor(site, template, inputs, script) : [];

    const status: StudioProjectStatus =
      voiceChanged && current.voice ? 'written' : (current.status as StudioProjectStatus);
    const [row] = await this.prisma.studioProject.updateManyAndReturn({
      where: { id, siteId, status: { notIn: BUSY } },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.brief !== undefined && { brief: dto.brief?.trim() || null }),
        inputs: inputs as unknown as Prisma.InputJsonValue,
        ...(script && { script: script as unknown as Prisma.InputJsonValue }),
        warnings: warnings as unknown as Prisma.InputJsonValue,
        ...(oldVoice && { voice: Prisma.DbNull, voiceJobId: null }),
        status: script && status === 'draft' ? 'written' : status,
        error: null,
        updatedBy: user.id,
      },
    });
    if (!row) throw busy();
    if (oldVoice) await this.deleteFiles(oldVoice.lines.map((l) => l.key));
    return this.toResponse(site, row);
  }

  async remove(siteId: string, id: string, user: AuthUser): Promise<void> {
    await this.sites.getAccessible(siteId, user);
    const current = await this.getOrFail(siteId, id);
    assertIdle(current);
    await this.assertUnused(siteId, id);
    const renders = await this.prisma.studioRender.findMany({
      where: { projectId: id, status: 'completed' },
      select: { id: true },
    });
    const { count } = await this.prisma.studioProject.deleteMany({
      where: { id, siteId, status: { notIn: BUSY } },
    });
    if (!count) throw busy();
    const voice = current.voice as unknown as StoredVoice | null;
    await this.deleteFiles([
      ...(voice?.lines.map((l) => l.key) ?? []),
      ...renders.flatMap((r) => {
        const key = videoKey(siteId, id, r.id);
        return [key, ...Object.values(videoWebKeys(key))];
      }),
    ]);
  }

  /**
   * A clip of this project (any of its renders) in an article body: 409 video_in_use, as images
   * of the media library (deleting the project deletes its files, the article would break).
   */
  private async assertUnused(siteId: string, id: string): Promise<void> {
    const bodies = await this.prisma.articleTranslation.count({
      where: { siteId, body: { contains: `/studio/${siteId}/${id}/` } },
    });
    if (bodies) {
      throw new ConflictException({
        message: `The video is used by ${bodies} article translation(s): remove it from them first`,
        code: 'video_in_use',
      });
    }
  }

  /* ─────────────────────────────── Steps ─────────────────────────────── */

  /**
   * "Suggest with AI" (202): the empty business facts come from the brand kit at once; the empty
   * descriptive facts (`suggest` slots) are drafted by ai-service, the pictured looks named from
   * their images. Nothing to draft: the brand facts are saved and nothing else happens.
   */
  async requestSuggest(siteId: string, id: string, user: AuthUser): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const project = await this.getOrFail(siteId, id);
    assertIdle(project);
    const template = this.templateOf(project);
    const brand = await this.brand.resolve(site);
    const inputs = withBrandFacts(template, site, currentInputs(project), brand);
    const locale = project.language === 'vi' ? 'vi' : 'en';

    const media = await this.prisma.media.findMany({
      where: { siteId, status: 'ready', id: { in: Object.values(inputs.images) } },
    });
    const imageKey = (slot: string) => {
      const row = media.find((m) => m.id === inputs.images[slot]);
      // The smallest size is plenty to name a look.
      const smallest = row && variantsOf(row)[0];
      return row && smallest
        ? [this.urls.key(siteId, row.id, smallest.width, row.contentType as MediaContentType)]
        : [];
    };
    const fields = offeredFacts(template, site)
      .filter((slot) => slot.suggest && !inputs.facts[slot.id]?.trim())
      .flatMap((slot) => {
        const images = slot.suggest?.images?.flatMap(imageKey);
        if (slot.suggest?.images && !images?.length) return []; // nothing pictured to name
        return [
          {
            id: slot.id,
            label: slot.label[locale],
            hint: slot.hint[locale],
            maxLength: Math.max(20, Math.min(slot.maxLength, 2000)),
            ...(slot.suggest?.lines && { lines: slot.suggest.lines }),
            ...(images?.length && { images }),
          },
        ];
      });
    if (!fields.length) {
      const [row] = await this.prisma.studioProject.updateManyAndReturn({
        where: { id, siteId, status: { notIn: BUSY } },
        data: { inputs: inputs as unknown as Prisma.InputJsonValue, updatedBy: user.id },
      });
      if (!row) throw busy();
      return this.toResponse(site, row);
    }

    const known = template.facts
      .filter((slot) => slot.kind === 'text' && inputs.facts[slot.id]?.trim())
      .map((slot) => ({ id: slot.id, text: inputs.facts[slot.id].slice(0, KNOWN_FACT_MAX) }));
    const jobId = randomUUID();
    const event: FactSuggestionRequestedEvent = {
      jobId,
      requester: REQUESTER,
      siteId,
      language: project.language,
      template: template.instructions,
      title: project.title,
      ...(project.brief && { brief: project.brief }),
      brand: {
        name: brand.brandName,
        ...(brand.tagline && { tagline: brand.tagline }),
        ...(brand.tone && { tone: brand.tone }),
        ...(brand.callToAction && { callToAction: brand.callToAction }),
      },
      known,
      fields,
      actorId: user.id,
    };
    const row = await this.startStep(
      project,
      'suggesting',
      { suggestJobId: jobId, inputs: inputs as unknown as Prisma.InputJsonValue },
      user,
      (tx) => addToOutbox(tx, FACT_SUGGESTION_EVENTS.REQUESTED, event),
    );
    return this.toResponse(site, row);
  }

  /** Asks ai-service to write the script (202). Needs the template's required facts. */
  async requestScript(siteId: string, id: string, user: AuthUser): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const project = await this.getOrFail(siteId, id);
    assertIdle(project);
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const missing = template.facts.find((f) => f.required && !inputs.facts[f.id]?.trim());
    if (missing) throw missingInput(`fact ${missing.id}`);

    const brand = await this.brand.resolve(site);
    const facts = await this.factTexts(site, template, inputs, project.language);
    const jobId = randomUUID();
    const event: ScriptWritingRequestedEvent = {
      jobId,
      requester: REQUESTER,
      siteId,
      language: project.language,
      instructions: template.instructions,
      ...(project.brief && { brief: project.brief }),
      brand: {
        name: brand.brandName,
        ...(brand.tagline && { tagline: brand.tagline }),
        ...(brand.tone && { tone: brand.tone }),
        ...(brand.callToAction && { callToAction: brand.callToAction }),
        ...(brand.phone && { phone: brand.phone }),
      },
      facts: Object.entries(facts).map(([factId, text]) => ({ id: factId, text })),
      bannedPhrases: brand.bannedPhrases,
      scenes: activeScenes(template, inputs).map((s) => ({
        id: s.id,
        purpose: s.purpose,
        maxWords: s.maxWords,
        onScreenMaxChars: s.onScreenMaxChars,
      })),
      hookVariants: 3,
      actorId: user.id,
    };
    const row = await this.startStep(project, 'writing', { scriptJobId: jobId }, user, (tx) =>
      addToOutbox(tx, SCRIPT_WRITING_EVENTS.REQUESTED, event),
    );
    return this.toResponse(site, row);
  }

  /** Asks ai-service to speak every line, each with its speaker's voice (202). */
  async requestVoice(siteId: string, id: string, user: AuthUser): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const project = await this.getOrFail(siteId, id);
    assertIdle(project);
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const script = project.script as unknown as StudioScript | null;
    if (!script) throw missingInput('script');
    if (!narrated(template, inputs)) {
      throw new UnprocessableEntityException({
        message: 'This video has no narration: render it directly',
        code: 'invalid_inputs',
      });
    }

    const avatars = await this.avatars.findMany(siteId, Object.values(inputs.avatars));
    const voiceOf = (speakerId: string) => {
      const speaker = template.speakers.find((s) => s.id === speakerId);
      const chosen = inputs.voices[speakerId];
      if (chosen) return chosen;
      const avatarId = speaker?.avatar ? inputs.avatars[speaker.avatar] : undefined;
      return avatars.find((a) => a.id === avatarId)?.voice ?? DEFAULT_VOICE;
    };
    const lines = activeScenes(template, inputs).flatMap((spec) => {
      const line = script.scenes.find((s) => s.id === spec.id);
      return line?.voice.trim()
        ? [{ id: spec.id, text: line.voice, voice: voiceOf(spec.speaker) }]
        : [];
    });
    if (!lines.length) throw missingInput('script');

    const jobId = randomUUID();
    const event: SpeechRequestedEvent = {
      jobId,
      requester: REQUESTER,
      siteId,
      language: project.language,
      keyPrefix: `studio/${siteId}/${project.id}/voice/${jobId}/`,
      lines,
      actorId: user.id,
    };
    const row = await this.startStep(project, 'voicing', { voiceJobId: jobId }, user, (tx) =>
      addToOutbox(tx, SPEECH_EVENTS.REQUESTED, event),
    );
    return this.toResponse(site, row);
  }

  /**
   * Asks render-worker for the MP4 (202). Needs every required image and avatar, and the voice
   * unless the video is silent (a template with optional narration, turned off).
   */
  async requestRender(siteId: string, id: string, user: AuthUser): Promise<StudioProjectResponse> {
    const site = await this.sites.getAccessible(siteId, user);
    const project = await this.getOrFail(siteId, id);
    assertIdle(project);
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const script = project.script as unknown as StudioScript | null;
    const voice = project.voice as unknown as StoredVoice | null;
    if (!script) throw missingInput('script');
    if (!voice && narrated(template, inputs)) throw missingInput('voice');
    const image = template.images.find((slot) => slot.required && !inputs.images[slot.id]);
    if (image) throw missingInput(`image ${image.id}`);
    const avatar = template.avatars.find((slot) => !inputs.avatars[slot.id]);
    if (avatar) throw missingInput(`avatar ${avatar.id}`);

    const props = await this.compose(site, project, { strict: true });
    const renderId = randomUUID();
    const event: VideoRenderRequestedEvent = {
      renderId,
      siteId,
      projectId: project.id,
      composition: template.id,
      props,
      outputKey: videoKey(siteId, project.id, renderId),
    };
    const row = await this.startStep(project, 'rendering', { renderId }, user, async (tx) => {
      // One site's renders are counted one request at a time: two can't both take the last one.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`studio-renders:${siteId}`}))`;
      const used = await tx.studioRender.count({
        where: { siteId, createdAt: { gte: monthStart() }, status: { not: 'failed' } },
      });
      if (used >= this.rendersPerMonth) {
        throw new UnprocessableEntityException({
          message: `This site made its ${this.rendersPerMonth} videos this month`,
          code: 'quota_exceeded',
        });
      }
      await tx.studioRender.create({
        data: {
          id: renderId,
          siteId,
          projectId: project.id,
          templateId: template.id,
          createdBy: user.id,
        },
      });
      await addToOutbox(tx, VIDEO_RENDER_EVENTS.REQUESTED, event);
    });
    return this.toResponse(site, row);
  }

  /* ─────────────── Results (inside the inbox transaction, StudioResults) ─────────────── */

  async scriptWritten(tx: Tx, event: ScriptWritingCompletedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, scriptJobId: event.jobId, status: 'writing' },
    });
    if (!project) return; // deleted meanwhile, or an old job
    const site = await tx.site.findUniqueOrThrow({ where: { id: project.siteId } });
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const script: StudioScript = {
      hooks: event.hooks,
      scenes: event.scenes,
      caption: event.caption,
      hashtags: event.hashtags,
    };
    const warnings = await this.warningsFor(site, template, inputs, script, tx);
    const oldVoice = project.voice as unknown as StoredVoice | null;
    await tx.studioProject.update({
      where: { id: project.id },
      data: {
        script: script as unknown as Prisma.InputJsonValue,
        warnings: warnings as unknown as Prisma.InputJsonValue,
        voice: Prisma.DbNull,
        voiceJobId: null,
        status: 'written',
        error: null,
      },
    });
    // Files of the replaced voice: deleted after the commit would be cleaner, but a failed delete
    // only leaves an orphan file; never a broken project.
    if (oldVoice) void this.deleteFiles(oldVoice.lines.map((l) => l.key));
  }

  /**
   * The drafts: only into facts still empty, only for slots that may be suggested, and a line
   * with a number the business didn't give is dropped (the AI must not invent figures).
   */
  async suggestionWritten(tx: Tx, event: FactSuggestionCompletedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, suggestJobId: event.jobId, status: 'suggesting' },
    });
    if (!project) return;
    const site = await tx.site.findUniqueOrThrow({ where: { id: project.siteId } });
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const brand = await this.brand.resolve(site);
    const known = new Set(
      [
        ...Object.values(inputs.facts),
        project.title,
        brand.brandName,
        brand.tagline ?? '',
        brand.phone ?? '',
      ].flatMap(numbersIn),
    );
    const allowed = new Map(
      offeredFacts(template, site)
        .filter((slot) => slot.suggest)
        .map((slot) => [slot.id, slot]),
    );
    const facts = { ...inputs.facts };
    const suggested = new Set(inputs.suggested ?? []);
    for (const draft of event.facts) {
      const slot = allowed.get(draft.id);
      if (!slot || facts[draft.id]?.trim()) continue;
      const text = draft.text
        .split('\n')
        .filter((line) => numbersIn(line).every((n) => Number(n) <= 10 || known.has(n)))
        .join('\n')
        .slice(0, slot.maxLength)
        .trim();
      if (!text) continue;
      facts[draft.id] = text;
      suggested.add(draft.id);
    }
    await tx.studioProject.update({
      where: { id: project.id },
      data: {
        inputs: { ...inputs, facts, suggested: [...suggested] },
        status: restingStatus(project),
        suggestJobId: null,
        error: null,
      },
    });
  }

  async suggestionFailed(tx: Tx, event: FactSuggestionFailedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, suggestJobId: event.jobId, status: 'suggesting' },
    });
    if (!project) return;
    await tx.studioProject.update({
      where: { id: project.id },
      data: {
        status: restingStatus(project),
        suggestJobId: null,
        error: `suggest_${event.reason}`,
      },
    });
  }

  async scriptFailed(tx: Tx, event: ScriptWritingFailedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, scriptJobId: event.jobId, status: 'writing' },
    });
    if (!project) return;
    await tx.studioProject.update({
      where: { id: project.id },
      data: {
        status: project.script ? (project.voice ? 'voiced' : 'written') : 'draft',
        error: `script_${event.reason}`,
      },
    });
  }

  async voiceReady(tx: Tx, event: SpeechCompletedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, voiceJobId: event.jobId, status: 'voicing' },
    });
    if (!project) return;
    const prefix = `studio/${project.siteId}/${project.id}/voice/${event.jobId}/`;
    const voice: StoredVoice = {
      jobId: event.jobId,
      lines: event.lines
        .filter((line) => line.key.startsWith(prefix)) // only where we asked
        .map((line) => ({ id: line.id, key: line.key, durationMs: line.durationMs })),
    };
    const oldVoice = project.voice as unknown as StoredVoice | null;
    await tx.studioProject.update({
      where: { id: project.id },
      data: {
        voice: voice as unknown as Prisma.InputJsonValue,
        status: 'voiced',
        error: null,
      },
    });
    if (oldVoice && oldVoice.jobId !== event.jobId) {
      void this.deleteFiles(oldVoice.lines.map((l) => l.key));
    }
  }

  async voiceFailed(tx: Tx, event: SpeechFailedEvent): Promise<void> {
    const project = await tx.studioProject.findFirst({
      where: { siteId: event.siteId, voiceJobId: event.jobId, status: 'voicing' },
    });
    if (!project) return;
    await tx.studioProject.update({
      where: { id: project.id },
      data: { status: project.voice ? 'voiced' : 'written', error: `voice_${event.reason}` },
    });
  }

  async rendered(tx: Tx, event: VideoRenderCompletedEvent): Promise<void> {
    const render = await tx.studioRender.findFirst({
      where: { id: event.renderId, siteId: event.siteId, status: 'pending' },
    });
    if (!render) return;
    await tx.studioRender.update({
      where: { id: render.id },
      data: {
        status: 'completed',
        sizeBytes: event.sizeBytes,
        durationMs: event.durationMs,
        renderMs: event.renderMs,
        completedAt: new Date(),
      },
    });
    if (!render.projectId || event.key !== videoKey(render.siteId, render.projectId, render.id)) {
      return;
    }
    const video: StoredVideo = {
      renderId: render.id,
      key: event.key,
      sizeBytes: event.sizeBytes,
      ...(event.webSizeBytes && { webSizeBytes: event.webSizeBytes }),
      durationMs: event.durationMs,
      renderedAt: new Date().toISOString(),
    };
    await tx.studioProject.updateMany({
      where: { id: render.projectId, renderId: render.id, status: 'rendering' },
      data: { video: video as unknown as Prisma.InputJsonValue, status: 'rendered', error: null },
    });
  }

  async renderFailed(tx: Tx, event: VideoRenderFailedEvent): Promise<void> {
    const render = await tx.studioRender.findFirst({
      where: { id: event.renderId, siteId: event.siteId, status: 'pending' },
    });
    if (!render) return;
    await tx.studioRender.update({
      where: { id: render.id },
      data: {
        status: 'failed',
        error: (event.detail ?? event.reason).slice(0, 300),
        completedAt: new Date(),
      },
    });
    if (!render.projectId) return;
    await tx.studioProject.updateMany({
      where: { id: render.projectId, renderId: render.id, status: 'rendering' },
      data: { status: 'voiced', error: `render_${event.reason}` },
    });
  }

  /* ─────────────────────────────── Helpers ─────────────────────────────── */

  private async startStep(
    project: StudioProject,
    status: StudioProjectStatus,
    ids: Partial<
      Pick<StudioProject, 'scriptJobId' | 'voiceJobId' | 'renderId' | 'suggestJobId'>
    > & {
      inputs?: Prisma.InputJsonValue;
    },
    user: AuthUser,
    publish: (tx: Tx) => Promise<unknown>,
  ): Promise<StudioProject> {
    const row = await this.prisma.$transaction(async (tx) => {
      const [updated] = await tx.studioProject.updateManyAndReturn({
        where: { id: project.id, siteId: project.siteId, status: { notIn: BUSY } },
        data: { ...ids, status, error: null, updatedBy: user.id },
      });
      if (!updated) throw busy();
      await publish(tx);
      return updated;
    });
    this.outbox.poke();
    return row;
  }

  private templateFor(site: Site, templateId: string): StudioTemplate {
    const template = studioTemplate(templateId);
    if (!template || template.excludeSites.includes(site.id)) {
      throw new UnprocessableEntityException({
        message: `Template ${templateId} is not available for this site`,
        code: 'invalid_template',
      });
    }
    return template;
  }

  /** The project's template. Today every template has version 1; a new version keeps the old one. */
  private templateOf(project: StudioProject): StudioTemplate {
    const template = studioTemplate(project.templateId);
    if (!template) throw new NotFoundException(`Template ${project.templateId} no longer exists`);
    return template;
  }

  /**
   * Keeps only the template's slots, and only values of THIS site: ready images, its avatars,
   * known voices, facts within their length, published articles.
   */
  private async checkInputs(
    site: Site,
    template: StudioTemplate,
    raw: StudioInputs,
  ): Promise<StudioInputs> {
    const pick = (map: Record<string, unknown>, ids: string[]) =>
      Object.fromEntries(
        ids.flatMap((id) => {
          const value = map[id];
          return typeof value === 'string' && value.trim() ? [[id, value.trim()]] : [];
        }),
      ) as Record<string, string>;
    const inputs: StudioInputs = {
      images: pick(
        raw.images,
        template.images.map((s) => s.id),
      ),
      avatars: pick(
        raw.avatars,
        template.avatars.map((s) => s.id),
      ),
      voices: pick(
        raw.voices,
        template.speakers.map((s) => s.id),
      ),
      // Never a fact the site doesn't get (wine: prices).
      facts: pick(
        raw.facts,
        template.facts.filter((s) => !s.excludeSites?.includes(site.id)).map((s) => s.id),
      ),
      ...(template.narration === 'optional' && { narration: raw.narration === true }),
    };
    const invalid = (what: string) =>
      new UnprocessableEntityException({ message: `Invalid ${what}`, code: 'invalid_inputs' });

    const mediaIds = [...new Set(Object.values(inputs.images))];
    if (mediaIds.some((value) => !UUID.test(value))) throw invalid('image');
    const ready = await this.prisma.media.count({
      where: { siteId: site.id, status: 'ready', id: { in: mediaIds } },
    });
    if (ready !== mediaIds.length) throw invalid('image');

    const avatarIds = [...new Set(Object.values(inputs.avatars))];
    if (avatarIds.some((value) => !UUID.test(value))) throw invalid('avatar');
    if ((await this.avatars.findMany(site.id, avatarIds)).length !== avatarIds.length) {
      throw invalid('avatar');
    }
    if (Object.values(inputs.voices).some((v) => !STUDIO_VOICE_IDS.includes(v))) {
      throw invalid('voice');
    }
    for (const slot of template.facts) {
      const value = inputs.facts[slot.id];
      if (!value) continue;
      if (slot.kind === 'text' && value.length > slot.maxLength) throw invalid(`fact ${slot.id}`);
      if (slot.kind === 'article') {
        const article = UUID.test(value)
          ? await this.prisma.article.findFirst({
              where: { id: value, siteId: site.id, status: 'published' },
              select: { id: true },
            })
          : null;
        if (!article) throw invalid(`article ${slot.id}`);
      }
    }
    return inputs;
  }

  /** Each fact as text for the AI: free text as is, an article as title + plain text. */
  private async factTexts(
    site: Site,
    template: StudioTemplate,
    inputs: StudioInputs,
    language: string,
  ): Promise<Record<string, string>> {
    const facts: Record<string, string> = {};
    for (const slot of template.facts) {
      const value = inputs.facts[slot.id];
      if (!value) continue;
      if (slot.kind === 'text') {
        facts[slot.id] = value;
        continue;
      }
      const translation = await this.prisma.articleTranslation.findFirst({
        where: { articleId: value, siteId: site.id, locale: language },
        select: { title: true, excerpt: true, body: true },
      });
      if (!translation) {
        throw new UnprocessableEntityException({
          message: `The article has no ${language} version`,
          code: 'invalid_inputs',
        });
      }
      facts[slot.id] =
        `${translation.title}\n\n${translation.excerpt}\n\n${htmlToText(translation.body)}`.slice(
          0,
          ARTICLE_FACT_MAX,
        );
    }
    return facts;
  }

  private async warningsFor(
    site: Site,
    template: StudioTemplate,
    inputs: StudioInputs,
    script: StudioScript,
    tx: Tx | PrismaService = this.prisma,
  ) {
    const brand = await this.brand.resolve(site);
    const texts = await this.factTextsAnyLanguage(site, template, inputs, tx);
    return checkScript(template, inputs, script, {
      facts: [
        ...texts,
        brand.phone ?? '',
        brand.tagline ?? '',
        brand.callToAction ?? '',
        brand.brandName,
      ],
      bannedPhrases: brand.bannedPhrases,
    });
  }

  /** Text facts plus every language of the articles (numbers are the same in each). */
  private async factTextsAnyLanguage(
    site: Site,
    template: StudioTemplate,
    inputs: StudioInputs,
    tx: Tx | PrismaService,
  ): Promise<string[]> {
    const texts: string[] = [];
    for (const slot of template.facts) {
      const value = inputs.facts[slot.id];
      if (!value) continue;
      if (slot.kind === 'text') {
        texts.push(value);
        continue;
      }
      const translations = await tx.articleTranslation.findMany({
        where: { articleId: value, siteId: site.id },
        select: { title: true, excerpt: true, body: true },
      });
      texts.push(...translations.map((t) => `${t.title} ${t.excerpt} ${htmlToText(t.body)}`));
    }
    return texts;
  }

  /**
   * The composition props: every input resolved to a public URL. `strict` (render): a missing
   * image or avatar is an error; the preview just leaves it out.
   */
  private async compose(
    site: Site,
    project: StudioProject,
    { strict }: { strict: boolean },
  ): Promise<StudioCompositionProps> {
    const template = this.templateOf(project);
    const inputs = currentInputs(project);
    const script = project.script as unknown as StudioScript;
    const voice = project.voice as unknown as StoredVoice | null;
    const brand = await this.brand.resolve(site);

    const media = await this.prisma.media.findMany({
      where: { siteId: site.id, status: 'ready', id: { in: Object.values(inputs.images) } },
    });
    const images: Record<string, string> = {};
    for (const [slot, mediaId] of Object.entries(inputs.images)) {
      const row = media.find((m) => m.id === mediaId);
      if (row) images[slot] = this.urls.image(row).url;
      else if (strict) throw missingInput(`image ${slot}`);
    }
    const avatarRows = await this.avatars.findMany(site.id, Object.values(inputs.avatars));
    const avatars: Record<string, string> = {};
    for (const [slot, avatarId] of Object.entries(inputs.avatars)) {
      const row = avatarRows.find((a) => a.id === avatarId);
      if (row && row.media.status === 'ready') avatars[slot] = this.urls.image(row.media).url;
      else if (strict) throw missingInput(`avatar ${slot}`);
    }
    const voiceLines: ResolvedAssets['voice'] = Object.fromEntries(
      (voice?.lines ?? []).map((line) => [
        line.id,
        { url: this.storage.publicUrl(line.key), durationMs: line.durationMs },
      ]),
    );
    return buildCompositionProps(
      template,
      inputs,
      script,
      { brand: brandProps(brand), images, avatars, voice: voiceLines },
      project.language,
    );
  }

  private async getOrFail(siteId: string, id: string): Promise<StudioProject> {
    const row = await this.prisma.studioProject.findFirst({ where: { id, siteId } });
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    return row;
  }

  private async deleteFiles(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.storage.delete('public', key).catch((error: unknown) => {
        this.logger.warn(`could not delete ${key}: ${(error as Error).message}`);
      });
    }
  }

  private toSummary(row: StudioProject): StudioProjectSummary {
    const video = row.video as unknown as StoredVideo | null;
    return {
      id: row.id,
      siteId: row.siteId,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      title: row.title,
      language: row.language,
      status: row.status as StudioProjectStatus,
      brief: row.brief,
      video: video ? this.videoResponse(video) : null,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toResponse(site: Site, row: StudioProject): Promise<StudioProjectResponse> {
    const voice = row.voice as unknown as StoredVoice | null;
    return {
      ...this.toSummary(row),
      inputs: currentInputs(row),
      script: row.script as unknown as StudioScript | null,
      warnings: row.warnings as unknown as StudioProjectResponse['warnings'],
      voice: voice
        ? {
            lines: voice.lines.map((line) => ({
              id: line.id,
              url: this.storage.publicUrl(line.key),
              durationMs: line.durationMs,
            })),
          }
        : null,
      preview: row.script ? await this.compose(site, row, { strict: false }) : null,
    };
  }

  private videoResponse(video: StoredVideo): StudioVideo {
    const web = video.webSizeBytes ? videoWebKeys(video.key) : null;
    return {
      renderId: video.renderId,
      url: this.storage.publicUrl(video.key),
      sizeBytes: video.sizeBytes,
      webUrl: web && this.storage.publicUrl(web.web),
      webSizeBytes: video.webSizeBytes ?? null,
      posterUrl: web && this.storage.publicUrl(web.poster),
      durationMs: video.durationMs,
      renderedAt: video.renderedAt,
    };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function videoKey(siteId: string, projectId: string, renderId: string): string {
  return `studio/${siteId}/${projectId}/video/${renderId}.mp4`;
}

function currentInputs(project: StudioProject): StudioInputs {
  const inputs = project.inputs as unknown as Partial<StudioInputs>;
  return {
    images: inputs.images ?? {},
    avatars: inputs.avatars ?? {},
    voices: inputs.voices ?? {},
    facts: inputs.facts ?? {},
    ...(inputs.narration !== undefined && { narration: inputs.narration }),
    ...(inputs.suggested?.length && { suggested: inputs.suggested }),
  };
}

/** Where a project is when nothing runs: from what it already has. */
function restingStatus(project: StudioProject): StudioProjectStatus {
  if (project.video) return 'rendered';
  if (project.voice) return 'voiced';
  return project.script ? 'written' : 'draft';
}

/** The template's facts this site gets (wine: no prices). */
function offeredFacts(template: StudioTemplate, site: Site) {
  return template.facts.filter((slot) => !slot.excludeSites?.includes(site.id));
}

/** Empty business facts filled from the brand kit (typed once there, never by AI). */
export function withBrandFacts(
  template: StudioTemplate,
  site: Site,
  inputs: StudioInputs,
  brand: StudioBrandKitResponse,
): StudioInputs {
  const facts = { ...inputs.facts };
  for (const slot of offeredFacts(template, site)) {
    const value = slot.fromBrand ? brand[slot.fromBrand]?.trim() : undefined;
    if (value && !facts[slot.id]?.trim()) facts[slot.id] = value.slice(0, slot.maxLength);
  }
  return { ...inputs, facts };
}

/**
 * AI drafts the admin left as they were stay marked; an edited one is the admin's now. `inputs`
 * comes from checkInputs: never a `suggested` list from the client.
 */
function keepUneditedDrafts(inputs: StudioInputs, before: StudioInputs): StudioInputs {
  const kept = (before.suggested ?? []).filter(
    (id) => inputs.facts[id] && inputs.facts[id] === before.facts[id],
  );
  return kept.length ? { ...inputs, suggested: kept } : inputs;
}

function brandProps(brand: StudioBrandKitResponse): StudioCompositionProps['brand'] {
  return {
    name: brand.brandName,
    tagline: brand.tagline,
    phone: brand.phone,
    callToAction: brand.callToAction,
    footerNote: brand.footerNote,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    logoUrl: brand.logo?.url ?? null,
  };
}

/** Article HTML (sanitized by us) → plain text for the AI. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/section|\/blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function assertIdle(project: StudioProject): void {
  if (BUSY.includes(project.status as StudioProjectStatus)) throw busy();
}

function busy() {
  return new ConflictException({
    message: 'The project is busy (a script, voice or render is in progress)',
    code: 'busy',
  });
}

function missingInput(what: string) {
  return new UnprocessableEntityException({ message: `Missing ${what}`, code: 'missing_input' });
}
