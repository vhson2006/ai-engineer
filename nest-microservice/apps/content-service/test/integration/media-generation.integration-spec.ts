import request from 'supertest';
import { IMAGE_GENERATION_EVENTS } from '@app/common';
import { asToken, createTestApp, TestApp } from '../support/app';
import { site, users } from '../support/fixtures';
import { mediaRow } from '../support/media';
import { outboxSubjects, resetPrismaMock } from '../support/prisma-mock';

describe('AI media generation (content-service integration)', () => {
  let t: TestApp;
  const base = '/api/content/sites/nails/media';
  const JOB = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
  const body = { prompt: 'A bright laundromat', aspectRatio: '16:9', count: 2 };
  const reader = { id: 'u-reader', roles: ['content:read'], groups: ['/sites/nails'] };
  const job = (media: unknown[] = []) => ({
    id: JOB,
    siteId: 'nails',
    prompt: body.prompt,
    aspectRatio: '16:9',
    count: 2,
    status: 'pending',
    generated: null,
    createdBy: users.writer.id,
    createdAt: new Date(),
    media,
  });

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock(t.prisma, site);
    t.prisma.imageGenerationJob.findMany.mockResolvedValue([]);
  });

  it('202 + Location of the job, pending AI images, the request in the outbox', async () => {
    t.prisma.imageGenerationJob.findFirst.mockResolvedValue(
      job([mediaRow({ source: 'ai', status: 'pending', variants: [], prompt: body.prompt })]),
    );
    const res = await request(t.app.getHttpServer())
      .post(`${base}/generate`)
      .set('Authorization', await t.bearer(asToken(users.writer)))
      .send(body)
      .expect(202);
    expect(res.headers.location).toMatch(new RegExp(`${base}/generations/[0-9a-f-]{36}$`));
    expect(res.body).toMatchObject({
      status: 'pending',
      remaining: 48, // CONTENT_AI_IMAGES_PER_MONTH default 50
      media: [{ source: 'ai', status: 'pending', prompt: body.prompt }],
    });
    expect(t.prisma.media.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(outboxSubjects(t.prisma)).toEqual([IMAGE_GENERATION_EVENTS.REQUESTED]);
  });

  it('422 quota_exceeded, 400 for a bad ratio or count: nothing written', async () => {
    const auth = await t.bearer(asToken(users.writer));
    t.prisma.imageGenerationJob.findMany.mockResolvedValue([{ count: 4, generated: 49 }]);
    const quota = await request(t.app.getHttpServer())
      .post(`${base}/generate`)
      .set('Authorization', auth)
      .send(body)
      .expect(422);
    expect(quota.body.code).toBe('quota_exceeded');

    for (const bad of [
      { ...body, aspectRatio: '2:1' },
      { ...body, count: 5 },
      { ...body, prompt: '' },
    ]) {
      await request(t.app.getHttpServer())
        .post(`${base}/generate`)
        .set('Authorization', auth)
        .send(bad)
        .expect(400);
    }
    expect(t.prisma.media.createMany).not.toHaveBeenCalled();
    expect(t.prisma.outboxMessage.create).not.toHaveBeenCalled();
  });

  it('401 without a token, 403 for a reader, 404 for another site (nothing written)', async () => {
    await request(t.app.getHttpServer()).post(`${base}/generate`).send(body).expect(401);
    await request(t.app.getHttpServer())
      .post(`${base}/generate`)
      .set('Authorization', await t.bearer(asToken(reader)))
      .send(body)
      .expect(403);
    await request(t.app.getHttpServer())
      .post(`${base}/generate`)
      .set('Authorization', await t.bearer(asToken(users.outsider)))
      .send(body)
      .expect(404);
    expect(t.prisma.media.createMany).not.toHaveBeenCalled();
  });

  it('GET the job (content:read): its images; 404 unknown, 400 not a UUID', async () => {
    const ready = mediaRow({ source: 'ai', prompt: body.prompt });
    t.prisma.imageGenerationJob.findFirst.mockResolvedValueOnce({
      ...job([ready]),
      status: 'completed',
      generated: 1,
    });
    t.prisma.imageGenerationJob.findMany.mockResolvedValue([{ count: 2, generated: 1 }]);
    const auth = await t.bearer(asToken(reader));
    const res = await request(t.app.getHttpServer())
      .get(`${base}/generations/${JOB}`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body).toMatchObject({
      jobId: JOB,
      status: 'completed',
      remaining: 49,
      media: [{ id: ready.id, source: 'ai', url: expect.stringContaining('1280.webp') }],
    });

    t.prisma.imageGenerationJob.findFirst.mockResolvedValueOnce(null);
    await request(t.app.getHttpServer())
      .get(`${base}/generations/${JOB}`)
      .set('Authorization', auth)
      .expect(404);
    await request(t.app.getHttpServer())
      .get(`${base}/generations/nope`)
      .set('Authorization', auth)
      .expect(400);
  });
});
