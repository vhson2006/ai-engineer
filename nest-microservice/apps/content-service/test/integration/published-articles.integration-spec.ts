import request from 'supertest';
import { asToken, createTestApp, TestApp } from '../support/app';
import {
  ARTICLE_ID as id,
  articleRow,
  CATEGORY_ID,
  CREATED,
  site,
  translationRow,
  users,
} from '../support/fixtures';
import { resetPrismaMock } from '../support/prisma-mock';

describe('Published articles (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/published-articles';
  const live = () => ({
    ...articleRow({
      status: 'published',
      publishedAt: CREATED,
      translations: [translationRow('en', 'five-habits'), translationRow('vi', 'nam-thoi-quen')],
    }),
    category: {
      id: CATEGORY_ID,
      key: 'care',
      translations: [{ locale: 'vi', name: 'Chăm sóc móng', slug: 'cham-soc-mong' }],
    },
  });

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
  });

  it('400 for a language the site does not have', async () => {
    await request(t.app.getHttpServer())
      .get(`${base}?locale=fr`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(400);
  });

  it('lists published articles of one language, filtered by a category slug', async () => {
    t.prisma.categoryTranslation.findUnique.mockResolvedValue({ categoryId: CATEGORY_ID });
    t.prisma.article.findMany.mockResolvedValue([live()]);
    t.prisma.article.count.mockResolvedValue(1);
    const res = await request(t.app.getHttpServer())
      .get(`${base}?locale=vi&category=cham-soc-mong`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(200);
    expect(res.body.meta).toMatchObject({ total: 1 });
    expect(res.body.data[0]).toMatchObject({ id, locale: 'vi', slug: 'nam-thoi-quen' });
    expect(t.prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          siteId: 'nails',
          status: 'published',
          categoryId: CATEGORY_ID,
        }),
      }),
    );
  });

  it('404 for an unknown category slug', async () => {
    t.prisma.categoryTranslation.findUnique.mockResolvedValue(null);
    await request(t.app.getHttpServer())
      .get(`${base}?locale=vi&category=khong-co`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(404);
  });

  it('finds an article by an OLD slug and answers its current slug (the site redirects)', async () => {
    t.prisma.articleTranslation.findUnique.mockResolvedValue(null);
    t.prisma.articleSlugRedirect.findUnique.mockResolvedValue({ articleId: id });
    t.prisma.article.findFirst.mockResolvedValue(live());

    const res = await request(t.app.getHttpServer())
      .get(`${base}/by-slug?locale=vi&slug=ten-cu`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(200);

    expect(res.body).toMatchObject({
      id,
      locale: 'vi',
      slug: 'nam-thoi-quen',
      category: { key: 'care', slug: 'cham-soc-mong', name: 'Chăm sóc móng' },
      alternates: [
        { locale: 'en', slug: 'five-habits' },
        { locale: 'vi', slug: 'nam-thoi-quen' },
      ],
    });
    expect(t.prisma.article.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, siteId: 'nails', status: 'published' } }),
    );
  });

  it('404 when the slug is unknown', async () => {
    t.prisma.articleTranslation.findUnique.mockResolvedValue(null);
    t.prisma.articleSlugRedirect.findUnique.mockResolvedValue(null);
    await request(t.app.getHttpServer())
      .get(`${base}/by-slug?locale=vi&slug=khong-co`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(404);
  });
});
