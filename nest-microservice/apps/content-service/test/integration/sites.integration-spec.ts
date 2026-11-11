import request from 'supertest';
import { asToken, createTestApp, TestApp } from '../support/app';
import { site, users } from '../support/fixtures';
import { resetPrismaMock } from '../support/prisma-mock';

describe('Sites (content-service integration)', () => {
  let t: TestApp;
  const body = { id: 'spa', name: 'Spa', locales: ['vi'], defaultLocale: 'vi' };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
  });

  it('401 without a token, with WWW-Authenticate and a problem body', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/content/sites').expect(401);
    expect(res.headers['www-authenticate']).toBe('Bearer realm="api"');
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('403 without content:read', async () => {
    await request(t.app.getHttpServer())
      .get('/api/content/sites')
      .set('Authorization', await t.bearer({ sub: 'u-none', roles: [], groups: ['/sites/nails'] }))
      .expect(403);
  });

  it('lists only the sites the user belongs to', async () => {
    t.prisma.site.findMany.mockResolvedValue([site]);
    await request(t.app.getHttpServer())
      .get('/api/content/sites')
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .expect(200);
    expect(t.prisma.site.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['nails'] } },
      orderBy: { id: 'asc' },
    });
  });

  it("404 on another tenant's site, like an unknown one", async () => {
    const res = await request(t.app.getHttpServer())
      .get('/api/content/sites/nails')
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .expect(404);
    expect(res.body).toMatchObject({ status: 404, code: 'not_found' });
    expect(t.prisma.site.findUnique).not.toHaveBeenCalled();
  });

  it('400 for a malformed site id', async () => {
    await request(t.app.getHttpServer())
      .get('/api/content/sites/Not_A_Site')
      .set('Authorization', await t.bearer(asToken(users.admin)))
      .expect(400);
  });

  it('403 for a writer creating a site (content:admin only), nothing written', async () => {
    await request(t.app.getHttpServer())
      .post('/api/content/sites')
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(403);
    expect(t.prisma.site.create).not.toHaveBeenCalled();
  });

  it('201 + Location when content:admin creates a site', async () => {
    t.prisma.site.create.mockResolvedValue({ ...site, ...body });
    const res = await request(t.app.getHttpServer())
      .post('/api/content/sites')
      .set('Authorization', await t.bearer(asToken(users.admin)))
      .send(body)
      .expect(201);
    expect(res.headers.location).toBe('/api/content/sites/spa');
  });

  it('400 when defaultLocale is not one of the locales', async () => {
    const res = await request(t.app.getHttpServer())
      .post('/api/content/sites')
      .set('Authorization', await t.bearer(asToken(users.admin)))
      .send({ ...body, defaultLocale: 'en' })
      .expect(400);
    expect(res.body.detail).toMatch(/defaultLocale en/);
    expect(t.prisma.site.create).not.toHaveBeenCalled();
  });

  it('PATCH needs no If-Match and answers the site, without an ETag', async () => {
    t.prisma.site.updateManyAndReturn.mockResolvedValue([{ ...site, name: 'Envy' }]);
    const res = await request(t.app.getHttpServer())
      .patch('/api/content/sites/nails')
      .set('Authorization', await t.bearer(asToken(users.admin)))
      .send({ name: 'Envy' })
      .expect(200);
    expect(res.body.name).toBe('Envy');
    expect(res.headers.etag).toBeUndefined();
  });
});
