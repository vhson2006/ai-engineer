import request from 'supertest';
import { asToken, createTestApp, TestApp } from '../support/app';
import { CATEGORY_ID, CREATED, site, users } from '../support/fixtures';
import { resetPrismaMock } from '../support/prisma-mock';

describe('Categories (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/categories';
  const body = {
    key: 'care',
    translations: [
      { locale: 'en', name: 'Nail care', slug: 'nail-care' },
      { locale: 'vi', name: 'Chăm sóc móng', slug: 'cham-soc-mong' },
    ],
  };
  const category = {
    id: CATEGORY_ID,
    siteId: 'nails',
    key: 'care',
    position: 0,
    createdAt: CREATED,
    updatedAt: CREATED,
    translations: body.translations.map((tr) => ({
      ...tr,
      siteId: 'nails',
      categoryId: CATEGORY_ID,
    })),
  };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
  });

  it('lists the categories of a site in display order', async () => {
    t.prisma.category.findMany.mockResolvedValue([category]);
    const res = await request(t.app.getHttpServer())
      .get(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(200);
    expect(res.body[0]).toMatchObject({
      key: 'care',
      translations: [{ locale: 'en' }, { locale: 'vi' }],
    });
  });

  it('201 + Location when a writer creates one', async () => {
    t.prisma.category.create.mockResolvedValue(category);
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(201);
    expect(res.headers.location).toBe(`${base}/${CATEGORY_ID}`);
  });

  it('422 unsupported_locale for a language the site does not have, nothing written', async () => {
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send({ key: 'care', translations: [{ locale: 'fr', name: 'Soins', slug: 'soins' }] })
      .expect(422);
    expect(res.body).toMatchObject({ code: 'unsupported_locale' });
    expect(res.body.detail).toMatch(/fr is not a language/);
    expect(t.prisma.category.create).not.toHaveBeenCalled();
  });

  it('409 when the key or a slug is taken on the site', async () => {
    t.prisma.category.create.mockRejectedValue(
      Object.assign(new Error('internals'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        meta: { modelName: 'Category', target: 'uq_categories_site_key' },
      }),
    );
    const res = await request(t.app.getHttpServer())
      .post(base)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(409);
    expect(res.body.code).toBe('unique_violation');
  });

  it('422 when deleting a category an article still uses', async () => {
    t.prisma.category.deleteMany.mockRejectedValue(
      Object.assign(new Error('internals'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2003',
      }),
    );
    await request(t.app.getHttpServer())
      .delete(`${base}/${CATEGORY_ID}`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(422);
  });

  it('204 when deleting an unused one, 404 for an unknown id', async () => {
    const auth = await t.bearer(asToken(users.writer));
    t.prisma.category.deleteMany.mockResolvedValue({ count: 1 });
    await request(t.app.getHttpServer())
      .delete(`${base}/${CATEGORY_ID}`)
      .set('Authorization', auth)
      .expect(204);
    t.prisma.category.deleteMany.mockResolvedValue({ count: 0 });
    await request(t.app.getHttpServer())
      .delete(`${base}/${CATEGORY_ID}`)
      .set('Authorization', auth)
      .expect(404);
  });
});
