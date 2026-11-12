import request from 'supertest';
import { asToken, createTestApp, TestApp } from '../support/app';
import { site, users } from '../support/fixtures';
import { mediaRow } from '../support/media';
import { resetPrismaMock } from '../support/prisma-mock';

describe('Media (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/media';
  const row = mediaRow();
  const body = {
    filename: 'shop.jpg',
    contentType: 'image/webp',
    variants: [
      { width: 640, height: 427, size: 40_000 },
      { width: 1280, height: 853, size: 120_000 },
    ],
  };
  const reader = { id: 'u-reader', roles: ['content:read'], groups: ['/sites/nails'] };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
    t.storage.objects.clear();
  });

  it('lists the ready images of a site with their CDN URLs', async () => {
    t.prisma.media.findMany.mockResolvedValue([row]);
    t.prisma.media.count.mockResolvedValue(1);
    const res = await request(t.app.getHttpServer())
      .get(base)
      .set('Authorization', await t.bearer(asToken(reader)))
      .expect(200);
    expect(res.body.meta).toMatchObject({ total: 1 });
    expect(res.body.data[0]).toMatchObject({
      id: row.id,
      url: `https://cdn.test/media/nails/${row.id}/1280.webp`,
      variants: [{ width: 640 }, { width: 1280 }],
    });
    expect(t.prisma.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'nails', status: 'ready' } }),
    );
  });

  it('declares an upload: 201 + Location + one presigned PUT per size', async () => {
    t.prisma.media.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ ...row, ...data, status: 'pending' }),
    );
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(201);
    expect(res.headers.location).toMatch(new RegExp(`${base}/[0-9a-f-]{36}$`));
    expect(res.body.uploads).toHaveLength(2);
    expect(res.body.uploads[1]).toMatchObject({ width: 1280, method: 'PUT' });
  });

  it('400 for a type the browser would run or a size too large, nothing written', async () => {
    for (const bad of [
      { ...body, contentType: 'image/svg+xml' },
      { ...body, variants: [{ width: 4000, height: 3000, size: 1 }] },
      { ...body, variants: [{ width: 640, height: 427, size: 10 * 1024 * 1024 }] },
      { ...body, extra: 'x' },
    ]) {
      await request(t.app.getHttpServer())
        .post(base)
        .set('Authorization', await t.bearer(asToken(users.writer)))
        .send(bad)
        .expect(400);
    }
    expect(t.prisma.media.create).not.toHaveBeenCalled();
  });

  it('401 without a token, 403 without content:write (nothing written)', async () => {
    await request(t.app.getHttpServer()).post(base).send(body).expect(401);
    await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send(body)
      .expect(403);
    expect(t.prisma.media.create).not.toHaveBeenCalled();
  });

  it("404 for a site the caller doesn't manage", async () => {
    await request(t.app.getHttpServer())
      .get(base)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .expect(404);
  });

  it('completes an upload once every size is in storage (409 before)', async () => {
    t.prisma.media.findFirst.mockResolvedValue(mediaRow({ status: 'pending' }));
    const complete = async () =>
      request(t.app.getHttpServer())
        .post(`${base}/${row.id}/complete`)
        .set('Authorization', await t.bearer(asToken(users.writer)));

    const early = await complete();
    expect(early.status).toBe(409);
    expect(early.body.code).toBe('upload_incomplete');

    t.storage.put('public', `media/nails/${row.id}/640.webp`, {
      size: 40_000,
      contentType: 'image/webp',
    });
    t.storage.put('public', `media/nails/${row.id}/1280.webp`, {
      size: 120_000,
      contentType: 'image/webp',
    });
    t.prisma.media.findFirst
      .mockReset()
      .mockResolvedValueOnce(mediaRow({ status: 'pending' }))
      .mockResolvedValueOnce(row);
    const done = await complete();
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('ready');
  });

  it('refuses to delete an image in use (409 media_in_use), deletes an unused one (204)', async () => {
    t.prisma.media.findFirst.mockResolvedValue(row);
    t.prisma.article.count.mockResolvedValue(1);
    t.prisma.articleTranslation.count.mockResolvedValue(0);
    const auth = await t.bearer(asToken(users.writer));
    const used = await request(t.app.getHttpServer())
      .delete(`${base}/${row.id}`)
      .set('Authorization', auth)
      .expect(409);
    expect(used.body.code).toBe('media_in_use');

    t.prisma.article.count.mockResolvedValue(0);
    t.prisma.media.deleteMany.mockResolvedValue({ count: 1 });
    await request(t.app.getHttpServer())
      .delete(`${base}/${row.id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('400 for an id that is not a UUID', async () => {
    await request(t.app.getHttpServer())
      .delete(`${base}/not-a-uuid`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(400);
  });
});
