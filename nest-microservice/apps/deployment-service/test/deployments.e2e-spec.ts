import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUTH_JWKS,
  DEPLOYMENT_EVENTS,
  DEPLOYMENT_ROLES,
  JETSTREAM,
  OutboxRelay,
} from '@app/common';
import { createLocalJWKSet, exportJWK, generateKeyPair, KeyLike, SignJWT } from 'jose';
import request from 'supertest';
import { DeploymentServiceModule } from '../src/deployment-service.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

/**
 * deployment-service e2e: the real HTTP pipeline (prefix, AuthGuard, roles, validation, filter,
 * status codes, headers) and the real DeploymentsService. Prisma and NATS are mocked.
 *
 * Tokens are REAL RS256 JWTs signed with a key pair generated here; the service verifies them
 * with the matching public key (AUTH_JWKS overridden with a local key set), exactly like it
 * verifies Keycloak tokens. KrakenD forwards responses as-is (no-op), so these are also what
 * clients get through the gateway.
 */
describe('Deployments (deployment-service e2e)', () => {
  let app: INestApplication;
  let signingKey: KeyLike;
  let otherKey: KeyLike;
  const kid = 'test-key';

  const ISSUER = process.env.AUTH_ISSUER!;
  const AUDIENCE = process.env.AUTH_AUDIENCE!;
  const { READ, WRITE, ADMIN } = DEPLOYMENT_ROLES;

  const users = {
    viewer: { sub: 'user-viewer', roles: [READ] },
    dev: { sub: 'user-dev', roles: [READ, WRITE] },
    otherDev: { sub: 'user-other-dev', roles: [READ, WRITE] },
    admin: { sub: 'user-admin', roles: [READ, WRITE, ADMIN] },
  };

  interface TokenOptions {
    sub: string;
    roles: string[];
    key?: KeyLike;
    issuer?: string;
    audience?: string;
    expiresAt?: number | string;
  }

  const token = (o: TokenOptions) =>
    new SignJWT({
      preferred_username: o.sub,
      resource_access: { [AUDIENCE]: { roles: o.roles } },
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setSubject(o.sub)
      .setIssuer(o.issuer ?? ISSUER)
      .setAudience(o.audience ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(o.expiresAt ?? '5m')
      .sign(o.key ?? signingKey);

  const bearer = async (o: TokenOptions) => `Bearer ${await token(o)}`;

  const prisma = {
    deployment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateManyAndReturn: jest.fn(),
      updateMany: jest.fn(),
    },
    storedFile: { updateMany: jest.fn() }, // FilesService.attach
    outboxMessage: { create: jest.fn() }, // addToOutbox (same transaction)
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  // No NATS in tests: the relay and the JetStream connection are replaced.
  const outbox = { poke: jest.fn(), start: jest.fn(), stop: jest.fn() };
  const jetstream = { nc: { drain: jest.fn() }, js: { publish: jest.fn() }, jsm: {} };

  const id = '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f';
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const row = (overrides: Record<string, unknown> = {}) => ({
    id,
    name: 'checkout-api',
    version: '1.4.0',
    environment: 'production',
    status: 'pending',
    description: null,
    createdBy: users.dev.sub,
    revision: 1,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  });
  const deployment = {
    id,
    name: 'checkout-api',
    version: '1.4.0',
    environment: 'production',
    status: 'pending',
    description: null,
    createdBy: users.dev.sub,
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const prismaError = (code: string) =>
    Object.assign(new Error('prisma internals'), { name: 'PrismaClientKnownRequestError', code });

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    signingKey = pair.privateKey;
    otherKey = (await generateKeyPair('RS256')).privateKey; // an attacker's key
    const publicJwk = { ...(await exportJWK(pair.publicKey)), kid, alg: 'RS256' };

    const moduleRef = await Test.createTestingModule({ imports: [DeploymentServiceModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(JETSTREAM)
      .useValue(jetstream)
      .overrideProvider(OutboxRelay)
      .useValue(outbox)
      .overrideProvider(AUTH_JWKS)
      .useValue(createLocalJWKSet({ keys: [publicJwk] }))
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    // Array form resolves the queries; callback form (create + attach) runs with the mock as tx.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
  });

  const http = () => request(app.getHttpServer());

  describe('authentication (401)', () => {
    it('401 without a token — nothing is read', async () => {
      const res = await http().get('/api/deployments').expect(401);
      expect(res.body).toEqual({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing bearer token',
        code: 'unauthorized',
        instance: '/api/deployments',
        requestId: res.headers['x-request-id'],
      });
      // RFC 9110 §15.5.2: a 401 MUST carry a challenge; no error code without credentials (RFC 6750).
      expect(res.headers['www-authenticate']).toBe('Bearer realm="api"');
      expect(prisma.deployment.findMany).not.toHaveBeenCalled();
    });

    it('401 with a non-Bearer Authorization header', async () => {
      await http()
        .get('/api/deployments')
        .set('Authorization', 'Basic YWRtaW46YWRtaW4=')
        .expect(401);
    });

    it.each<[string, () => Promise<string>]>([
      ['signed with another key', () => bearer({ ...users.admin, key: otherKey })],
      ['expired', () => bearer({ ...users.admin, expiresAt: Math.floor(Date.now() / 1000) - 60 })],
      ['from another issuer', () => bearer({ ...users.admin, issuer: 'http://evil/realms/x' })],
      ['for another audience', () => bearer({ ...users.admin, audience: 'other-api' })],
      ['garbage', () => Promise.resolve('Bearer not.a.jwt')],
    ])('401 for a token %s, with a generic message', async (_case, auth) => {
      const res = await http()
        .get('/api/deployments')
        .set('Authorization', await auth())
        .expect(401);
      expect(res.body.detail).toBe('Invalid or expired token');
      expect(res.headers['www-authenticate']).toBe('Bearer realm="api", error="invalid_token"');
      expect(prisma.deployment.findMany).not.toHaveBeenCalled();
    });

    it('401 for an HS256 token (only RS256 is accepted)', async () => {
      const hs = await new SignJWT({ resource_access: { [AUDIENCE]: { roles: [ADMIN] } } })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('attacker')
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode('guessed-secret-guessed-secret-32b'));

      await http().get('/api/deployments').set('Authorization', `Bearer ${hs}`).expect(401);
    });
  });

  describe('authorization (403)', () => {
    it('403 when the role is missing (viewer cannot create) — nothing is written', async () => {
      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.viewer))
        .send({ name: 'a', version: '1.0.0' })
        .expect(403);

      expect(res.body).toMatchObject({ status: 403, code: 'forbidden' });
      expect(res.headers['www-authenticate']).toBe(
        'Bearer realm="api", error="insufficient_scope"',
      );
      expect(prisma.deployment.create).not.toHaveBeenCalled();
    });

    it('403 when a token has no roles for this API at all', async () => {
      await http()
        .get('/api/deployments')
        .set('Authorization', await bearer({ sub: 'nobody', roles: [] }))
        .expect(403);
    });

    it("403 when a developer updates someone else's deployment (ownership rule)", async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.otherDev))
        .send({ status: 'running' })
        .expect(403);

      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it("200 when an admin updates someone else's deployment", async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateManyAndReturn.mockResolvedValue([
        row({ status: 'running', revision: 2 }),
      ]);

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.admin))
        .send({ status: 'running' })
        .expect(200);
    });
  });

  describe('POST /api/deployments', () => {
    it('201 + Location + creator from the token, then emits deployments.created', async () => {
      prisma.deployment.create.mockResolvedValue(row());

      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'checkout-api', version: '1.4.0', environment: 'production' })
        .expect(201);

      expect(res.headers.location).toBe(`/api/deployments/${id}`);
      expect(res.headers.etag).toBe('"1"');
      expect(res.body).toEqual(deployment);
      expect(prisma.deployment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ createdBy: users.dev.sub }),
      });
      expect(prisma.outboxMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subject: DEPLOYMENT_EVENTS.CREATED,
          payload: expect.objectContaining({ id, actorId: users.dev.sub }),
        }),
      });
    });

    it('400 on invalid body — nothing is written', async () => {
      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ version: 'abc' })
        .expect(400);
      expect(res.body).toMatchObject({ status: 400, code: 'validation_error' });
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'name', message: 'name must be a string' },
          { field: 'version', message: 'version must be semver, e.g. 1.4.0' },
        ]),
      );
      expect(prisma.deployment.create).not.toHaveBeenCalled();
    });

    it('400 on unknown fields, so a client cannot set createdBy itself', async () => {
      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', createdBy: users.admin.sub })
        .expect(400);
    });

    it('409 on a unique violation (Prisma P2002), without leaking it and without an event', async () => {
      prisma.deployment.create.mockRejectedValue(prismaError('P2002'));

      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0' })
        .expect(409);

      expect(res.body).toMatchObject({
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'Resource already exists',
        code: 'unique_violation',
      });
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/deployments with attachments', () => {
    const files = ['5b1f2c4e-8a9d-4e3f-b2c1-0d9e8f7a6b5c', '6c2a3d5f-9b0e-4f4a-83d2-1e0f9a8b7c6d'];

    it('201: attaches the files in the same transaction, only if they are mine and uploaded', async () => {
      prisma.deployment.create.mockResolvedValue(row());
      prisma.storedFile.updateMany.mockResolvedValue({ count: 2 });

      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', attachmentIds: files })
        .expect(201);

      expect(prisma.deployment.create).toHaveBeenCalledWith({
        data: { name: 'a', version: '1.0.0', createdBy: users.dev.sub }, // no attachmentIds column
      });
      expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: files },
          ownerId: users.dev.sub,
          status: 'uploaded',
          purpose: 'deployment-attachment',
          deploymentId: null,
        },
        data: { deploymentId: id },
      });
    });

    it('422 invalid_attachments when one is not attachable: rolled back, no event', async () => {
      prisma.deployment.create.mockResolvedValue(row());
      prisma.storedFile.updateMany.mockResolvedValue({ count: 1 });

      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', attachmentIds: files })
        .expect(422);

      expect(res.body.code).toBe('invalid_attachments');
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('400 for duplicate or non-UUID attachment ids', async () => {
      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', attachmentIds: [files[0], files[0]] })
        .expect(400);
      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', attachmentIds: ['x'] })
        .expect(400);
      expect(prisma.deployment.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/deployments', () => {
    it('200 with data + meta for a viewer, query coerced to numbers', async () => {
      prisma.deployment.findMany.mockResolvedValue([row()]);
      prisma.deployment.count.mockResolvedValue(6);

      const res = await http()
        .get('/api/deployments?page=2&limit=5')
        .set('Authorization', await bearer(users.viewer))
        .expect(200);

      expect(res.body).toEqual({
        data: [deployment],
        meta: { page: 2, limit: 5, total: 6, totalPages: 2 },
      });
      expect(prisma.deployment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('400 when limit is above the maximum', async () => {
      await http()
        .get('/api/deployments?limit=1000')
        .set('Authorization', await bearer(users.viewer))
        .expect(400);
    });
  });

  describe('GET /api/deployments/:id', () => {
    it('200 with the resource and its ETag (the revision to send back in If-Match)', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      await http()
        .get(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.viewer))
        .expect('ETag', '"1"')
        .expect(200, deployment);
    });

    it('400 when id is not a UUID', async () => {
      await http()
        .get('/api/deployments/not-a-uuid')
        .set('Authorization', await bearer(users.viewer))
        .expect(400);
      expect(prisma.deployment.findFirst).not.toHaveBeenCalled();
    });

    it('404 for an unknown id', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      const res = await http()
        .get(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);
      expect(res.body).toMatchObject({ status: 404, code: 'not_found' });
    });

    it('500 with a generic body for unexpected errors (no internals leaked)', async () => {
      prisma.deployment.findFirst.mockRejectedValue(new Error('postgres://secret@db failed'));

      const res = await http()
        .get(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(500);

      expect(res.body).toMatchObject({
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        code: 'internal_error',
      });
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });
  });

  describe('PATCH /api/deployments/:id', () => {
    it('200 when the creator updates it', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateManyAndReturn.mockResolvedValue([
        row({ status: 'running', revision: 2 }),
      ]);

      const res = await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'running' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'running', revision: 2 });
      expect(res.headers.etag).toBe('"2"');
      // Conditional on the revision the client read: a concurrent change makes it match 0 rows.
      expect(prisma.deployment.updateManyAndReturn).toHaveBeenCalledWith({
        where: { id, revision: 1, deletedAt: null },
        data: { status: 'running', revision: { increment: 1 } },
      });
    });

    it('428 without If-Match: blind overwrites are refused, nothing written', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());

      const res = await http()
        .patch(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'running' })
        .expect(428);

      expect(res.headers['content-type']).toBe('application/problem+json; charset=utf-8');
      expect(res.body).toMatchObject({ status: 428, code: 'precondition_required' });
      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it('412 when If-Match is stale (someone updated it since our GET), nothing written', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ revision: 3 }));

      const res = await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"2"')
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'running' })
        .expect(412);

      expect(res.body).toMatchObject({ status: 412, code: 'precondition_failed' });
      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('412 when another update wins the race between our read and our write', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row()); // revision 1 at read time...
      prisma.deployment.updateManyAndReturn.mockResolvedValue([]); // ...not any more at write time

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'running' })
        .expect(412);
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it('404 when it was deleted between our read and our write', async () => {
      prisma.deployment.findFirst.mockResolvedValueOnce(row()).mockResolvedValueOnce(null);
      prisma.deployment.updateManyAndReturn.mockResolvedValue([]);

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'running' })
        .expect(404);
    });

    it('If-Match: * and a list of tags are accepted; weak tags never match', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateManyAndReturn.mockResolvedValue([row({ revision: 2 })]);
      const patch = async (ifMatch: string) =>
        http()
          .patch(`/api/deployments/${id}`)
          .set('If-Match', ifMatch)
          .set('Authorization', await bearer(users.dev))
          .send({ status: 'running' });

      expect((await patch('*')).status).toBe(200);
      expect((await patch('"7", "1"')).status).toBe(200);
      expect((await patch('W/"1"')).status).toBe(412);
    });

    it("403 (not 412) for someone else's deployment, even with a stale If-Match", async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ revision: 5 }));

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.otherDev))
        .send({ status: 'running' })
        .expect(403);
    });

    it('400 on an invalid status', async () => {
      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ status: 'done' })
        .expect(400);
    });

    it('403 for a viewer (role checked before the body is used)', async () => {
      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.viewer))
        .send({ status: 'running' })
        .expect(403);
    });
  });

  describe('DELETE /api/deployments/:id', () => {
    it('204 with an empty body when the creator deletes it', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateMany.mockResolvedValue({ count: 1 });

      const res = await http()
        .delete(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.dev))
        .expect(204);
      expect(res.text).toBe('');
    });

    it('404 for an unknown id', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      await http()
        .delete(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.admin))
        .expect(404);
    });
  });

  describe('GET /health (public, outside the /api prefix)', () => {
    it('200 without a token when the database answers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await http().get('/health').expect(200, { status: 'ok', database: 'up' });
    });

    it('503 when the database is down', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));
      await http().get('/health').expect(503);
    });
  });

  describe('GET /metrics (Prometheus, for Grafana Alloy; outside the /api prefix)', () => {
    it('200 without a token, Prometheus text format', async () => {
      const res = await http().get('/metrics').expect(200);
      expect(res.headers['content-type']).toMatch(/^text\/plain/);
      expect(res.text).toContain('process_cpu_user_seconds_total{service="deployment-service"}');
    });

    it('records requests by route TEMPLATE (no ids, no query) and never itself', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      await http()
        .get(`/api/deployments/${id}?secret=1`)
        .set('Authorization', await bearer(users.viewer))
        .expect(404);

      const text = (await http().get('/metrics').expect(200)).text;
      expect(text).toMatch(
        /http_server_request_duration_seconds_count\{[^}]*method="GET",route="\/api\/deployments\/:id",status_code="404"/,
      );
      expect(text).not.toContain(id);
      expect(text).not.toContain('secret');
      expect(text).not.toMatch(/route="\/(metrics|health)"/);
    });

    it('is not in the Swagger document', async () => {
      const res = await http().get('/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).not.toContain('/metrics');
    });
  });

  describe('X-Request-Id (correlation id of the access log)', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    it('generates one on every response, errors included', async () => {
      const res = await http().get('/api/deployments').expect(401);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it("echoes the caller's id (e.g. set by Next.js) so logs can be joined end to end", async () => {
      prisma.deployment.findMany.mockResolvedValue([]);
      prisma.deployment.count.mockResolvedValue(0);

      const res = await http()
        .get('/api/deployments')
        .set('Authorization', await bearer(users.viewer))
        .set('X-Request-Id', 'next-req-42')
        .expect(200);

      expect(res.headers['x-request-id']).toBe('next-req-42');
    });

    it('replaces an unsafe id instead of logging it', async () => {
      const res = await http()
        .get('/api/deployments')
        .set('X-Request-Id', 'x'.repeat(200))
        .expect(401);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });
  });

  describe('HTTP standards (RFC 9110 / 9457 / 9111)', () => {
    it('errors are application/problem+json with instance and requestId', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      const res = await http()
        .get(`/api/deployments/${id}?x=1`)
        .set('Authorization', await bearer(users.viewer))
        .set('X-Request-Id', 'trace-7')
        .expect(404);

      expect(res.headers['content-type']).toBe('application/problem+json; charset=utf-8');
      expect(res.body).toMatchObject({ instance: `/api/deployments/${id}`, requestId: 'trace-7' });
    });

    it('PATCH with null for a required field → 400 naming the field (not 500), nothing written', async () => {
      const res = await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ name: null })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([{ field: 'name', message: 'name must be a string' }]),
      );
      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it('POST with null for an optional NOT NULL field → 400 (not 500)', async () => {
      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .send({ name: 'a', version: '1.0.0', environment: null })
        .expect(400);
      expect(prisma.deployment.create).not.toHaveBeenCalled();
    });

    it('PATCH description: null clears the description (nullable column)', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ description: 'old' }));
      prisma.deployment.updateManyAndReturn.mockResolvedValue([
        row({ description: null, revision: 2 }),
      ]);

      await http()
        .patch(`/api/deployments/${id}`)
        .set('If-Match', '"1"')
        .set('Authorization', await bearer(users.dev))
        .send({ description: null })
        .expect(200);

      expect(prisma.deployment.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({ data: { description: null, revision: { increment: 1 } } }),
      );
    });

    it('413 for a body over the limit (not 500)', async () => {
      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ name: 'a'.repeat(200_000), version: '1.0.0' }))
        .expect(413);
      expect(res.body).toMatchObject({ code: 'payload_too_large' });
    });

    it('415 for a body that is not JSON', async () => {
      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .set('Content-Type', 'text/plain')
        .send('name=a')
        .expect(415);
      expect(res.body).toMatchObject({ status: 415, code: 'unsupported_media_type' });
      expect(prisma.deployment.create).not.toHaveBeenCalled();
    });

    it('accepts JSON media types with parameters and +json suffixes', async () => {
      prisma.deployment.create.mockResolvedValue(row());
      await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(JSON.stringify({ name: 'a', version: '1.0.0' }))
        .expect(201);
    });

    it('400 malformed_body for invalid JSON, without parser details', async () => {
      const res = await http()
        .post('/api/deployments')
        .set('Authorization', await bearer(users.dev))
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);
      expect(res.body).toMatchObject({
        code: 'malformed_body',
        detail: 'The request body is not valid JSON',
      });
    });

    it('Cache-Control: no-store on API responses, successful or not', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      const ok = await http()
        .get(`/api/deployments/${id}`)
        .set('Authorization', await bearer(users.viewer))
        .expect(200);
      const denied = await http().get('/api/deployments').expect(401);

      expect(ok.headers['cache-control']).toBe('no-store');
      expect(denied.headers['cache-control']).toBe('no-store');
    });
  });
});
