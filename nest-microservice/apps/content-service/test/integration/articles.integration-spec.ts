import request from 'supertest';
import { ARTICLE_EVENTS } from '@app/common';
import { asToken, createTestApp, TestApp } from '../support/app';
import {
  ARTICLE_ID as id,
  articleRow,
  CATEGORY_ID as categoryId,
  site,
  translationRow,
  users,
} from '../support/fixtures';
import { resetPrismaMock } from '../support/prisma-mock';

describe('Articles (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/articles';
  const row = (overrides: Record<string, unknown> = {}) =>
    articleRow({
      translations: [translationRow('en', 'five-habits'), translationRow('vi', 'nam-thoi-quen')],
      ...overrides,
    });
  const body = {
    categoryId,
    translations: [
      {
        locale: 'en',
        title: 'Five habits',
        slug: 'five-habits',
        excerpt: 'E',
        body: '<p>Hi <script>alert(1)</script><a href="javascript:x" onclick="y">link</a></p>',
      },
      {
        locale: 'vi',
        title: 'Năm thói quen',
        slug: 'nam-thoi-quen',
        excerpt: 'E',
        body: '<ul><li>a</li></ul>',
      },
    ],
  };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
  });

  it("404 on another tenant's site, nothing read", async () => {
    await request(t.app.getHttpServer())
      .get(base)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .expect(404);
    expect(t.prisma.article.findMany).not.toHaveBeenCalled();
  });

  it('201 + Location for a draft', async () => {
    t.prisma.category.findFirst.mockResolvedValue({ id: categoryId });
    t.prisma.article.create.mockResolvedValue({ id });
    t.prisma.article.findUniqueOrThrow.mockResolvedValue(row());

    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(201);

    expect(res.headers.location).toBe(`${base}/${id}`);
    expect(res.body).toMatchObject({ id, status: 'draft', siteId: 'nails' });
    const { translations } = res.body as { translations: { slug: string }[] };
    expect(translations.map((tr) => tr.slug)).toEqual(['five-habits', 'nam-thoi-quen']);
    // Stored sanitized: no script, no event handler, an unsafe link loses its href.
    expect(t.prisma.articleTranslation.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ locale: 'en', body: '<p>Hi <a>link</a></p>' }),
        expect.objectContaining({ locale: 'vi', body: '<ul><li>a</li></ul>' }),
      ]) as unknown,
    });
  });

  it('400 when a body has no text once sanitized, nothing written', async () => {
    t.prisma.category.findFirst.mockResolvedValue({ id: categoryId });
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({
        ...body,
        translations: [{ ...body.translations[0], body: '<p><script>x()</script></p>' }],
      })
      .expect(400);
    expect(res.body.detail).toMatch(/en body has no text/);
    expect(t.prisma.article.create).not.toHaveBeenCalled();
  });

  it('400 with field errors for an invalid body (bad slug, empty body), nothing written', async () => {
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({
        categoryId,
        translations: [{ locale: 'en', title: 'T', slug: 'Bad Slug', excerpt: 'E', body: '' }],
      })
      .expect(400);
    expect(res.body.code).toBe('validation_error');
    expect(t.prisma.article.create).not.toHaveBeenCalled();
  });

  it('409 when a slug is taken in that language on the site', async () => {
    t.prisma.category.findFirst.mockResolvedValue({ id: categoryId });
    t.prisma.article.create.mockResolvedValue({ id });
    t.prisma.articleTranslation.createMany.mockRejectedValue(
      Object.assign(new Error('internals'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        meta: {
          modelName: 'ArticleTranslation',
          target: 'uq_article_translations_site_locale_slug',
        },
      }),
    );
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(409);
    expect(res.body.code).toBe('unique_violation');
  });

  it('PATCH needs no If-Match: the last write wins, and no ETag is sent', async () => {
    t.prisma.article.findFirst.mockResolvedValue(row());
    t.prisma.article.updateMany.mockResolvedValue({ count: 1 });
    t.prisma.article.findUniqueOrThrow.mockResolvedValue(row({ featured: true }));
    const res = await request(t.app.getHttpServer())
      .patch(`${base}/${id}`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ featured: true })
      .expect(200);
    expect(res.body.featured).toBe(true);
    expect(res.headers.etag).toBeUndefined();
    expect(t.prisma.article.updateMany).toHaveBeenCalledWith({
      where: { id, siteId: 'nails' },
      data: { featured: true, updatedBy: users.writer.id },
    });
  });

  it('403 for a writer publishing (content:publish only)', async () => {
    await request(t.app.getHttpServer())
      .post(`${base}/${id}/publish`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({})
      .expect(403);
  });

  it('422 missing_translations when publishing without every language', async () => {
    t.prisma.article.findFirst.mockResolvedValue(
      row({ translations: [translationRow('en', 'five-habits')] }),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/${id}/publish`)
      .set('Authorization', await t.bearer(asToken(users.publisher)))
      .send({})
      .expect(422);
    expect(res.body).toMatchObject({ code: 'missing_translations' });
    expect(res.body.detail).toMatch(/missing vi/);
  });

  it('200 when publishing, and the event goes to the outbox', async () => {
    t.prisma.article.findFirst.mockResolvedValue(row());
    t.prisma.article.updateMany.mockResolvedValue({ count: 1 });
    t.prisma.article.findUniqueOrThrow.mockResolvedValue(
      row({ status: 'published', publishedAt: new Date() }),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/${id}/publish`)
      .set('Authorization', await t.bearer(asToken(users.publisher)))
      .send({})
      .expect(200);
    expect(res.body.status).toBe('published');
    expect(t.prisma.outboxMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ subject: ARTICLE_EVENTS.PUBLISHED }),
    });
  });

  it('200 when unpublishing: back to draft', async () => {
    t.prisma.article.findFirst.mockResolvedValue(
      row({ status: 'published', publishedAt: new Date() }),
    );
    t.prisma.article.updateMany.mockResolvedValue({ count: 1 });
    t.prisma.article.findUniqueOrThrow.mockResolvedValue(row());
    const res = await request(t.app.getHttpServer())
      .post(`${base}/${id}/unpublish`)
      .set('Authorization', await t.bearer(asToken(users.publisher)))
      .expect(200);
    expect(res.body.status).toBe('draft');
  });

  it('204 when deleting a draft', async () => {
    t.prisma.article.findFirst.mockResolvedValue(row());
    t.prisma.article.deleteMany.mockResolvedValue({ count: 1 });
    await request(t.app.getHttpServer())
      .delete(`${base}/${id}`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(204);
  });
});
