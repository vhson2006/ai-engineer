import request from 'supertest';
import { FACT_SUGGESTION_EVENTS, SCRIPT_WRITING_EVENTS } from '@app/common';
import { asToken, createTestApp, TestApp } from '../support/app';
import { site, users } from '../support/fixtures';
import { mediaRow } from '../support/media';
import { outboxSubjects, resetPrismaMock } from '../support/prisma-mock';

describe('Studio (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/studio';
  const ID = '2c9d6f2a-4b1e-4c3d-9a8b-7f6e5d4c3b2a';
  const HERO = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
  const reader = { id: 'u-reader', roles: ['content:read'], groups: ['/sites/nails'] };
  const body = {
    templateId: 'price-hook',
    title: 'Giá giặt sấy',
    language: 'vi',
    inputs: {
      images: { hero: HERO },
      avatars: {},
      voices: { narrator: 'Kore' },
      facts: { price: 'Giặt sấy 35.000đ/mẻ' },
    },
  };
  const project = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    siteId: 'nails',
    templateId: 'price-hook',
    templateVersion: 1,
    title: 'Giá giặt sấy',
    language: 'vi',
    status: 'draft',
    brief: null,
    inputs: body.inputs,
    script: null,
    warnings: [],
    scriptJobId: null,
    voice: null,
    voiceJobId: null,
    video: null,
    renderId: null,
    error: null,
    createdBy: 'u-writer',
    updatedBy: 'u-writer',
    createdAt: new Date('2026-11-12T01:00:00Z'),
    updatedAt: new Date('2026-11-12T01:00:00Z'),
    ...overrides,
  });

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, { ...site, locales: ['vi', 'en'] });
    t.prisma.studioBrandKit.findUnique.mockResolvedValue(null);
    t.prisma.studioAvatar.findMany.mockResolvedValue([]);
    t.prisma.media.findMany.mockResolvedValue([mediaRow({ id: HERO })]);
  });

  it('lists the templates the site may use (wine: no price template, no price facts) and the voices', async () => {
    const res = await request(t.app.getHttpServer())
      .get(`${base}/templates`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(200);
    const ids = (body: unknown) =>
      (body as { templates: { id: string }[] }).templates.map((tpl) => tpl.id);
    expect(ids(res.body)).toEqual(['price-hook', 'host-intro', 'article-tips', 'brand-showcase']);
    expect(res.body.voices.length).toBeGreaterThan(0);

    t.prisma.site.findUnique.mockResolvedValue({ ...site, id: 'wine' });
    const wine = await request(t.app.getHttpServer())
      .get('/api/content/sites/wine/studio/templates')
      .set('Authorization', await t.bearer(asToken(users.admin)))
      .expect(200);
    expect(ids(wine.body)).not.toContain('price-hook');
    const factsOf = (body: unknown, id: string) =>
      (body as { templates: { id: string; facts: { id: string }[] }[] }).templates
        .find((tpl) => tpl.id === id)
        ?.facts.map((f) => f.id);
    expect(factsOf(res.body, 'brand-showcase')).toContain('prices');
    expect(factsOf(wine.body, 'brand-showcase')).not.toContain('prices');
    expect(factsOf(wine.body, 'brand-showcase')).not.toContain('signature');
  });

  it('gives a default brand kit from the site name until one is saved', async () => {
    const res = await request(t.app.getHttpServer())
      .get(`${base}/brand`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(200);
    expect(res.body).toMatchObject({ siteId: 'nails', brandName: site.name, bannedPhrases: [] });
  });

  it('creates a project: 201 + Location, inputs checked against the site', async () => {
    t.prisma.media.count.mockResolvedValue(1);
    t.prisma.studioProject.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve(project(data as Record<string, unknown>)),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/projects`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(201);
    expect(res.headers.location).toBe(`${base}/projects/${ID}`);
    expect(res.body).toMatchObject({ id: ID, status: 'draft', preview: null });
  });

  it('400 for an unknown template or an extra field, nothing written', async () => {
    for (const bad of [
      { ...body, templateId: 'nope' },
      { ...body, extra: 1 },
      { ...body, language: 'vietnamese' },
    ]) {
      await request(t.app.getHttpServer())
        .post(`${base}/projects`)
        .set('Authorization', await t.bearer(asToken(users.writer)))
        .send(bad)
        .expect(400);
    }
    expect(t.prisma.studioProject.create).not.toHaveBeenCalled();
  });

  it('401 without a token, 403 without content:write, 404 for another site', async () => {
    await request(t.app.getHttpServer()).post(`${base}/projects`).send(body).expect(401);
    await request(t.app.getHttpServer())
      .post(`${base}/projects`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send(body)
      .expect(403);
    await request(t.app.getHttpServer())
      .post(`${base}/projects`)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .send(body)
      .expect(404);
    expect(t.prisma.studioProject.create).not.toHaveBeenCalled();
  });

  it('asks the AI for the script: 202 + the event; 409 while busy', async () => {
    t.prisma.studioProject.findFirst.mockResolvedValue(project());
    t.prisma.studioProject.updateManyAndReturn.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve([project(data as Record<string, unknown>)]),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/projects/${ID}/script`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(202);
    expect(res.body.status).toBe('writing');
    expect(outboxSubjects(t.prisma)).toEqual([SCRIPT_WRITING_EVENTS.REQUESTED]);

    t.prisma.studioProject.findFirst.mockResolvedValue(project({ status: 'rendering' }));
    const busy = await request(t.app.getHttpServer())
      .post(`${base}/projects/${ID}/voice`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(409);
    expect(busy.body.code).toBe('busy');
  });

  it('suggests with AI: 202 + the event (price-hook: its benefits); 401, 403, 409 while busy', async () => {
    const url = `${base}/projects/${ID}/suggest`;
    t.prisma.studioProject.findFirst.mockResolvedValue(project());
    t.prisma.studioProject.updateManyAndReturn.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve([project(data as Record<string, unknown>)]),
    );
    await request(t.app.getHttpServer()).post(url).expect(401);
    await request(t.app.getHttpServer())
      .post(url)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(403);
    expect(t.prisma.outboxMessage.create).not.toHaveBeenCalled();

    const res = await request(t.app.getHttpServer())
      .post(url)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(202);
    expect(res.body.status).toBe('suggesting');
    expect(outboxSubjects(t.prisma)).toEqual([FACT_SUGGESTION_EVENTS.REQUESTED]);

    t.prisma.studioProject.findFirst.mockResolvedValue(project({ status: 'suggesting' }));
    const busy = await request(t.app.getHttpServer())
      .post(url)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(409);
    expect(busy.body.code).toBe('busy');
  });

  it('422 when rendering without a voice', async () => {
    t.prisma.studioProject.findFirst.mockResolvedValue(
      project({
        status: 'written',
        script: {
          hooks: [],
          scenes: [{ id: 'hook', voice: 'x', onScreen: 'y' }],
          caption: '',
          hashtags: [],
        },
      }),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/projects/${ID}/render`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(422);
    expect(res.body.code).toBe('missing_input');
  });

  it('400 for an avatar without a valid consent note or voice', async () => {
    await request(t.app.getHttpServer())
      .post(`${base}/avatars`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ name: 'Lan', mediaId: HERO, voice: 'Nobody', consentNote: 'ok' })
      .expect(400);
    expect(t.prisma.studioAvatar.create).not.toHaveBeenCalled();
  });
});
