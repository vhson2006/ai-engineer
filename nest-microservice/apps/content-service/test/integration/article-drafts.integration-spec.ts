import request from 'supertest';
import { ARTICLE_PROMPT_EVENTS, ARTICLE_WRITING_EVENTS } from '@app/common';
import { asToken, createTestApp, TestApp } from '../support/app';
import { CATEGORY_ID, site, users } from '../support/fixtures';
import { outboxSubjects, resetPrismaMock } from '../support/prisma-mock';

describe('AI articles (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/article-drafts';
  const ID = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const reader = { id: 'u-reader', roles: ['content:read'], groups: ['/sites/nails'] };
  const body = {
    categoryId: CATEGORY_ID,
    locale: 'en',
    idea: 'Gel that lasts',
    length: 'short',
    images: 1,
  };
  const brief =
    'You are a professional content writer for Envy Nails Spa. Write a short article about gel nails.';
  const job = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    siteId: 'nails',
    categoryId: CATEGORY_ID,
    locale: 'en',
    idea: { topic: 'Care', idea: 'Gel that lasts', length: 'short', images: 1 },
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
    createdBy: 'u-writer',
    updatedBy: 'u-writer',
    createdAt: new Date('2026-11-13T01:00:00Z'),
    updatedAt: new Date('2026-11-13T01:00:00Z'),
    completedAt: null,
    ...overrides,
  });

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
    t.prisma.studioBrandKit.findUnique.mockResolvedValue(null);
    t.prisma.articleTranslation.findMany.mockResolvedValue([]);
    t.prisma.category.findFirst.mockResolvedValue({
      id: CATEGORY_ID,
      key: 'care',
      translations: [],
    });
    t.prisma.articleDraftJob.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve(job(data as Record<string, unknown>)),
    );
  });

  it('starts one: 201 + Location, the brief asked for', async () => {
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(201);
    expect(res.headers.location).toBe(`${base}/${res.body.id}`);
    expect(res.body).toMatchObject({ status: 'prompting', locale: 'en', articleId: null });
    expect(outboxSubjects(t.prisma)).toEqual([ARTICLE_PROMPT_EVENTS.REQUESTED]);
  });

  it('400 for too many images or an extra field; 401, 403, 404 for another site; nothing written', async () => {
    for (const bad of [
      { ...body, images: 4 },
      { ...body, extra: 1 },
      { ...body, length: 'huge' },
    ]) {
      await request(t.app.getHttpServer())
        .post(base)
        .set('Authorization', await t.bearer(asToken(users.writer)))
        .send(bad)
        .expect(400);
    }
    await request(t.app.getHttpServer()).post(base).send(body).expect(401);
    await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send(body)
      .expect(403);
    await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .send(body)
      .expect(404);
    expect(t.prisma.articleDraftJob.create).not.toHaveBeenCalled();
  });

  it('a reader follows the job; the brief is confirmed (202), not twice (409)', async () => {
    t.prisma.articleDraftJob.findFirst.mockResolvedValue(
      job({ status: 'prompted', prompt: brief, outline: ['Prep'] }),
    );
    const read = await request(t.app.getHttpServer())
      .get(`${base}/${ID}`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(200);
    expect(read.body).toMatchObject({ status: 'prompted', prompt: brief, outline: ['Prep'] });

    t.prisma.articleDraftJob.count.mockResolvedValue(0);
    t.prisma.articleDraftJob.updateManyAndReturn.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve([job(data as Record<string, unknown>)]),
    );
    await request(t.app.getHttpServer())
      .post(`${base}/${ID}/write`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send({ prompt: brief, outline: ['Prep'] })
      .expect(403);
    const res = await request(t.app.getHttpServer())
      .post(`${base}/${ID}/write`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ prompt: brief, outline: ['Prep'] })
      .expect(202);
    expect(res.body.status).toBe('writing');
    expect(outboxSubjects(t.prisma)).toEqual([ARTICLE_WRITING_EVENTS.REQUESTED]);

    t.prisma.articleDraftJob.findFirst.mockResolvedValue(job({ status: 'writing', prompt: brief }));
    const busy = await request(t.app.getHttpServer())
      .post(`${base}/${ID}/write`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ prompt: brief, outline: ['Prep'] })
      .expect(409);
    expect(busy.body.code).toBe('busy');
  });
});
