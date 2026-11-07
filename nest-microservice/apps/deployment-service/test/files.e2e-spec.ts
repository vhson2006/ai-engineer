import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUTH_JWKS,
  DEPLOYMENT_ROLES,
  InMemoryObjectStorage,
  JETSTREAM,
  OutboxRelay,
  OBJECT_STORAGE,
} from '@app/common';
import { createLocalJWKSet, exportJWK, generateKeyPair, KeyLike, SignJWT } from 'jose';
import request from 'supertest';
import { DeploymentServiceModule } from '../src/deployment-service.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

/**
 * /api/files e2e: real HTTP pipeline, real FilesService, Prisma mocked, storage in memory.
 * The conditional SQL (attach, status transitions) is covered against a real Postgres in the
 * service's integration check; here: status codes, access rules, validation, storage calls.
 */
describe('Files (deployment-service e2e)', () => {
  let app: INestApplication;
  let signingKey: KeyLike;
  let storage: InMemoryObjectStorage;
  const kid = 'files-key';
  const { READ, WRITE, ADMIN } = DEPLOYMENT_ROLES;
  const users = {
    viewer: { sub: 'user-viewer', roles: [READ] },
    dev: { sub: 'user-dev', roles: [READ, WRITE] },
    otherDev: { sub: 'user-other-dev', roles: [READ, WRITE] },
    admin: { sub: 'user-admin', roles: [READ, WRITE, ADMIN] },
  };
  const bearer = async (u: { sub: string; roles: string[] }) =>
    `Bearer ${await new SignJWT({
      resource_access: { [process.env.AUTH_AUDIENCE!]: { roles: u.roles } },
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setSubject(u.sub)
      .setIssuer(process.env.AUTH_ISSUER!)
      .setAudience(process.env.AUTH_AUDIENCE!)
      .setExpirationTime('5m')
      .sign(signingKey)}`;

  const prisma = {
    deployment: { findFirst: jest.fn() },
    storedFile: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const fileId = '5b1f2c4e-8a9d-4e3f-b2c1-0d9e8f7a6b5c';
  const deploymentId = '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f';
  const file = (overrides: Record<string, unknown> = {}) => ({
    id: fileId,
    purpose: 'deployment-attachment',
    visibility: 'private',
    status: 'pending',
    storageKey: `deployment-attachment/2026/11/${fileId}.pdf`,
    originalName: 'report.pdf',
    contentType: 'application/pdf',
    size: 1000,
    ownerId: users.dev.sub,
    deploymentId: null,
    createdAt: new Date('2026-11-05T10:00:00Z'),
    uploadedAt: null,
    deletedAt: null,
    ...overrides,
  });

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    signingKey = pair.privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid, alg: 'RS256' };
    storage = new InMemoryObjectStorage();

    const moduleRef = await Test.createTestingModule({ imports: [DeploymentServiceModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      // No NATS in tests: the relay and the JetStream connection are replaced.
      .overrideProvider(JETSTREAM)
      .useValue({ nc: { drain: jest.fn() }, js: { publish: jest.fn() }, jsm: {} })
      .overrideProvider(OutboxRelay)
      .useValue({ poke: jest.fn(), start: jest.fn(), stop: jest.fn() })
      .overrideProvider(AUTH_JWKS)
      .useValue(createLocalJWKSet({ keys: [jwk] }))
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storage)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    storage.objects.clear();
    storage.deleted.length = 0;
    prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
    prisma.storedFile.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(file(data)),
    );
  });

  const http = () => request(app.getHttpServer());
  const pdf = {
    purpose: 'deployment-attachment',
    filename: 'report.pdf',
    contentType: 'application/pdf',
    size: 1000,
  };

  describe('POST /api/files/uploads', () => {
    it('201 + Location + presigned upload; the server picks the bucket and the key', async () => {
      const res = await http()
        .post('/api/files/uploads')
        .set('Authorization', await bearer(users.dev))
        .send({ ...pdf, filename: '../../etc/Report Q3.PDF' })
        .expect(201);

      const data = prisma.storedFile.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        visibility: 'private',
        ownerId: users.dev.sub,
        originalName: 'Report Q3.PDF', // directories stripped, never a path
      });
      expect(data.storageKey).toMatch(
        /^deployment-attachment\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/, // extension from the type
      );
      expect(res.headers.location).toBe(`/api/files/${data.id}`);
      expect(res.body.upload).toMatchObject({
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf', 'Content-Length': '1000' },
      });
      expect(res.body.file).toMatchObject({ status: 'pending', url: null });
    });

    it('a public-image goes to the public bucket', async () => {
      await http()
        .post('/api/files/uploads')
        .set('Authorization', await bearer(users.dev))
        .send({
          purpose: 'public-image',
          filename: 'hero.webp',
          contentType: 'image/webp',
          size: 2000,
        })
        .expect(201);
      expect(prisma.storedFile.create.mock.calls[0][0].data.visibility).toBe('public');
    });

    it('400 naming the field when the type or size is not allowed for the purpose', async () => {
      const res = await http()
        .post('/api/files/uploads')
        .set('Authorization', await bearer(users.dev))
        .send({
          purpose: 'public-image',
          filename: 'x.html',
          contentType: 'text/html',
          size: 6 * 1024 * 1024,
        })
        .expect(400);

      expect(res.body.code).toBe('validation_error');
      const errors = (res.body as { errors: { field: string }[] }).errors;
      expect(errors.map((e) => e.field).sort()).toEqual(['contentType', 'size']);
      expect(prisma.storedFile.create).not.toHaveBeenCalled();
    });

    it('400 for an unknown purpose; 403 for a viewer', async () => {
      await http()
        .post('/api/files/uploads')
        .set('Authorization', await bearer(users.dev))
        .send({ ...pdf, purpose: 'anything' })
        .expect(400);
      await http()
        .post('/api/files/uploads')
        .set('Authorization', await bearer(users.viewer))
        .send(pdf)
        .expect(403);
    });
  });

  describe('POST /api/files/:id/complete', () => {
    it('409 upload_incomplete while nothing is stored', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(file());
      const res = await http()
        .post(`/api/files/${fileId}/complete`)
        .set('Authorization', await bearer(users.dev))
        .expect(409);
      expect(res.body.code).toBe('upload_incomplete');
    });

    it('200 when the stored object matches; the row becomes uploaded with a private URL', async () => {
      const f = file();
      storage.put('private', f.storageKey, { size: 1000, contentType: 'application/pdf' });
      prisma.storedFile.findFirst
        .mockResolvedValueOnce(f)
        .mockResolvedValueOnce(file({ status: 'uploaded', uploadedAt: new Date() }));
      prisma.storedFile.updateMany.mockResolvedValue({ count: 1 });

      const res = await http()
        .post(`/api/files/${fileId}/complete`)
        .set('Authorization', await bearer(users.dev))
        .expect(200);

      expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
        where: { id: fileId, status: 'pending' },
        data: { status: 'uploaded', uploadedAt: expect.any(Date) },
      });
      expect(res.body).toMatchObject({
        status: 'uploaded',
        url: expect.stringContaining('signature'),
      });
      expect(res.body.urlExpiresAt).toEqual(expect.any(String));
    });

    it('422 upload_mismatch when the stored size or type differ: the object is deleted', async () => {
      const f = file();
      storage.put('private', f.storageKey, { size: 999_999, contentType: 'application/pdf' });
      prisma.storedFile.findFirst.mockResolvedValue(f);

      const res = await http()
        .post(`/api/files/${fileId}/complete`)
        .set('Authorization', await bearer(users.dev))
        .expect(422);

      expect(res.body.code).toBe('upload_mismatch');
      expect(storage.deleted).toEqual([`private:${f.storageKey}`]);
      expect(prisma.storedFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { status: 'deleted', deletedAt: expect.any(Date) },
      });
    });

    it("404 when completing someone else's upload", async () => {
      prisma.storedFile.findFirst.mockResolvedValue(file());
      await http()
        .post(`/api/files/${fileId}/complete`)
        .set('Authorization', await bearer(users.otherDev))
        .expect(404);
    });
  });

  describe('GET /api/files/:id (read access)', () => {
    it('owner sees a pending upload; nobody else does (404, not 403: no existence leak)', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(file());
      await http()
        .get(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.dev))
        .expect(200);
      await http()
        .get(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);
    });

    it('a public file: any reader, stable CDN URL, no expiry', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(
        file({
          visibility: 'public',
          purpose: 'public-image',
          status: 'uploaded',
          uploadedAt: new Date(),
          storageKey: 'public-image/2026/11/x.webp',
        }),
      );
      const res = await http()
        .get(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(200);
      expect(res.body).toMatchObject({
        url: 'https://cdn.test/public-image/2026/11/x.webp',
        urlExpiresAt: null,
      });
    });

    it('a private file: other readers only when it is attached to a live deployment', async () => {
      const uploaded = file({ status: 'uploaded', uploadedAt: new Date() });
      prisma.storedFile.findFirst.mockResolvedValue(uploaded);
      await http()
        .get(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);

      prisma.storedFile.findFirst.mockResolvedValue({ ...uploaded, deploymentId });
      prisma.deployment.findFirst.mockResolvedValue({ id: deploymentId });
      const res = await http()
        .get(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(200);
      expect(res.body.url).toContain('signature');
    });
  });

  describe('GET /api/files/:id/download-url', () => {
    const uploaded = (o: Record<string, unknown> = {}) =>
      file({ status: 'uploaded', uploadedAt: new Date(), ...o });

    it('private: presigned link with the original name, as attachment by default', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(uploaded());
      storage.downloads.length = 0;

      const res = await http()
        .get(`/api/files/${fileId}/download-url`)
        .set('Authorization', await bearer(users.dev))
        .expect(200);

      expect(res.body).toEqual({
        url: expect.stringContaining('signature'),
        expiresAt: expect.any(String),
        filename: 'report.pdf',
        contentType: 'application/pdf',
        size: 1000,
      });
      expect(storage.downloads[0]).toMatchObject({ filename: 'report.pdf', inline: false });
      expect(res.headers['cache-control']).toBe('no-store'); // the link is a secret
    });

    it('?disposition=inline asks the storage to display it; anything else is a 400', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(uploaded());
      storage.downloads.length = 0;
      await http()
        .get(`/api/files/${fileId}/download-url?disposition=inline`)
        .set('Authorization', await bearer(users.dev))
        .expect(200);
      expect(storage.downloads[0].inline).toBe(true);

      await http()
        .get(`/api/files/${fileId}/download-url?disposition=execute`)
        .set('Authorization', await bearer(users.dev))
        .expect(400);
    });

    it('public: the CDN URL, no expiry, for any reader', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(
        uploaded({
          visibility: 'public',
          purpose: 'public-image',
          storageKey: 'public-image/2026/11/a.png',
        }),
      );
      const res = await http()
        .get(`/api/files/${fileId}/download-url`)
        .set('Authorization', await bearer(users.viewer))
        .expect(200);
      expect(res.body).toMatchObject({
        url: 'https://cdn.test/public-image/2026/11/a.png',
        expiresAt: null,
      });
    });

    it('404 for a private file the reader may not see; 409 while not uploaded', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(uploaded());
      await http()
        .get(`/api/files/${fileId}/download-url`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);

      prisma.storedFile.findFirst.mockResolvedValue(file()); // pending, owner asks
      const res = await http()
        .get(`/api/files/${fileId}/download-url`)
        .set('Authorization', await bearer(users.dev))
        .expect(409);
      expect(res.body.code).toBe('upload_incomplete');
    });
  });

  describe('GET /api/files', () => {
    it('lists the attachments of a deployment', async () => {
      prisma.deployment.findFirst.mockResolvedValue({ id: deploymentId });
      prisma.storedFile.findMany.mockResolvedValue([
        file({ status: 'uploaded', uploadedAt: new Date(), deploymentId }),
      ]);
      prisma.storedFile.count.mockResolvedValue(1);

      const res = await http()
        .get(`/api/files?deploymentId=${deploymentId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(200);
      expect(res.body.meta).toMatchObject({ total: 1 });
      expect(prisma.storedFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deploymentId, status: 'uploaded' } }),
      );
    });

    it('404 for the files of an unknown deployment', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      await http()
        .get(`/api/files?deploymentId=${deploymentId}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('204 for the owner: detached, marked deleting, object deleted, then deleted', async () => {
      const f = file({ status: 'uploaded', uploadedAt: new Date(), deploymentId });
      prisma.storedFile.findFirst.mockResolvedValue(f);
      prisma.storedFile.updateMany.mockResolvedValue({ count: 1 });

      await http()
        .delete(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.dev))
        .expect(204);

      expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
        where: { id: fileId, status: { in: ['pending', 'uploaded'] } },
        data: { status: 'deleting', deletedAt: expect.any(Date), deploymentId: null },
      });
      expect(storage.deleted).toEqual([`private:${f.storageKey}`]);
      expect(prisma.storedFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { status: 'deleted' },
      });
    });

    it('404 for someone else (admins may delete)', async () => {
      prisma.storedFile.findFirst.mockResolvedValue(
        file({ status: 'uploaded', uploadedAt: new Date() }),
      );
      prisma.storedFile.updateMany.mockResolvedValue({ count: 1 });
      await http()
        .delete(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.otherDev))
        .expect(404);
      await http()
        .delete(`/api/files/${fileId}`)
        .set('Authorization', await bearer(users.admin))
        .expect(204);
    });
  });
});
