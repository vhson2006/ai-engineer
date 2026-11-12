import request from 'supertest';
import { TRANSLATION_EVENTS } from '@app/common';
import { asToken, createTestApp, TestApp } from '../support/app';
import { ARTICLE_ID, articleRow, site, translationRow, users } from '../support/fixtures';
import { outboxSubjects, resetPrismaMock } from '../support/prisma-mock';

describe('Translations (content-service integration)', () => {
  let t: TestApp;
  const article = `/api/content/sites/nails/articles/${ARTICLE_ID}`;
  const JOB = '5b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const reader = { id: 'u-reader', roles: ['content:read'], groups: ['/sites/nails'] };
  const jobRow = {
    id: JOB,
    siteId: 'nails',
    articleId: ARTICLE_ID,
    sourceLocale: 'vi',
    targetLocale: 'en',
    overwrite: false,
    status: 'pending',
    source: {},
    error: null,
    detail: null,
    warnings: null,
    provider: null,
    model: null,
    createdBy: 'u-writer',
    createdAt: new Date('2026-11-12T03:00:00Z'),
    completedAt: null,
  };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
  });

  it('202 + Location of the job, and the request goes out through the outbox', async () => {
    t.prisma.article.findFirst.mockResolvedValue(
      articleRow({ translations: [translationRow('vi')] }),
    );
    t.prisma.translationJob.findFirst.mockResolvedValue(null);
    t.prisma.translationJob.create.mockResolvedValue(jobRow);

    const res = await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ sourceLocale: 'vi' })
      .expect(202);

    expect(res.headers.location).toBe(`${article}/translation-jobs/${JOB}`);
    expect(res.body).toMatchObject({ id: JOB, status: 'pending', warnings: [] });
    expect(outboxSubjects(t.prisma)).toEqual([TRANSLATION_EVENTS.REQUESTED]);
  });

  it('409 not_a_draft for a live article, nothing written', async () => {
    t.prisma.article.findFirst.mockResolvedValue(
      articleRow({ status: 'published', publishedAt: new Date() }),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ sourceLocale: 'vi' })
      .expect(409);
    expect(res.body.code).toBe('not_a_draft');
    expect(t.prisma.translationJob.create).not.toHaveBeenCalled();
  });

  it('400 for a bad locale or body, 401 without a token, 403 without content:write', async () => {
    const auth = await t.bearer(asToken(users.writer));
    await request(t.app.getHttpServer())
      .post(`${article}/translations/EN!/auto`)
      .set('Authorization', auth)
      .send({ sourceLocale: 'vi' })
      .expect(400);
    await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .set('Authorization', auth)
      .send({ sourceLocale: 'xx-yy' })
      .expect(400);
    await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .set('Authorization', auth)
      .send({ sourceLocale: 'vi', extra: 1 })
      .expect(400);
    await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .send({ sourceLocale: 'vi' })
      .expect(401);
    await request(t.app.getHttpServer())
      .post(`${article}/translations/en/auto`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send({ sourceLocale: 'vi' })
      .expect(403);
    expect(t.prisma.translationJob.create).not.toHaveBeenCalled();
  });

  it('lists the jobs of the article and reads one (content:read); 404 for another site', async () => {
    t.prisma.translationJob.findMany.mockResolvedValue([
      { ...jobRow, status: 'completed', warnings: [{ kind: 'numbers', text: 'x' }] },
    ]);
    const list = await request(t.app.getHttpServer())
      .get(`${article}/translation-jobs`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(200);
    expect(list.body[0]).toMatchObject({ status: 'completed', warnings: [{ kind: 'numbers' }] });

    t.prisma.translationJob.findFirst.mockResolvedValue(null);
    await request(t.app.getHttpServer())
      .get(`${article}/translation-jobs/${JOB}`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(404);
    await request(t.app.getHttpServer())
      .get(`${article}/translation-jobs`)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .expect(404);
  });
});
