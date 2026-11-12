import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createMediaUpload: vi.fn(),
  completeMedia: vi.fn(),
  deleteMedia: vi.fn(),
  generateMedia: vi.fn(),
  getMediaGeneration: vi.fn(),
}));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/cache', () => cache);

const { declareMediaUploadAction, completeMediaAction, deleteMediaAction, generateMediaAction, getMediaGenerationAction } = await import('./actions');

const ID = '4f9b2c1e-8a3d-4e5f-9b6c-1d2e3f4a5b6c';
const valid = {
  filename: 'shop.jpg',
  contentType: 'image/webp',
  variants: [
    { width: 640, height: 427, size: 40_000 },
    { width: 1280, height: 853, size: 120_000 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({
    id: 'user-1',
    name: 'Dana',
    username: 'dana',
    roles: [],
  });
  api.createMediaUpload.mockResolvedValue({
    ok: true,
    data: { media: { id: ID }, uploads: [] },
  });
  api.completeMedia.mockResolvedValue({
    ok: true,
    data: { id: ID, status: 'ready' },
  });
  api.deleteMedia.mockResolvedValue({ ok: true, data: undefined });
});

describe('declareMediaUploadAction', () => {
  it('forwards only the declared fields to the API', async () => {
    const result = await declareMediaUploadAction('nails', {
      ...valid,
      siteId: 'wine',
      createdBy: 'someone-else',
      variants: valid.variants.map((v) => ({ ...v, url: 'https://evil.dev' })),
    });
    expect(result.ok).toBe(true);
    expect(api.createMediaUpload).toHaveBeenCalledWith('nails', valid);
  });

  it('refuses invalid input without calling the API', async () => {
    for (const input of [
      { ...valid, contentType: 'image/svg+xml' },
      { ...valid, variants: [{ width: 5000, height: 10, size: 1 }] },
      {
        ...valid,
        variants: [{ width: 640, height: 427, size: 10 * 1024 * 1024 }],
      },
      { ...valid, variants: [] },
      { ...valid, filename: '' },
    ]) {
      expect((await declareMediaUploadAction('nails', input)).ok).toBe(false);
    }
    expect(api.createMediaUpload).not.toHaveBeenCalled();
  });

  it('is rate limited per user (upload policy) and needs a session', async () => {
    limit.limitAction.mockResolvedValueOnce({
      ok: false,
      code: 'rate_limited',
      message: 'Too many',
      retryAfterS: 10,
    });
    expect(await declareMediaUploadAction('nails', valid)).toMatchObject({
      code: 'rate_limited',
    });
    expect(limit.limitAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'upload' }));
    session.getSessionUser.mockResolvedValueOnce(null);
    expect(await declareMediaUploadAction('nails', valid)).toMatchObject({
      code: 'unauthenticated',
    });
    expect(api.createMediaUpload).not.toHaveBeenCalled();
  });

  it('refuses a malformed site id before calling the API', async () => {
    expect(await declareMediaUploadAction('../wine', valid)).toMatchObject({
      ok: false,
      code: 'not_found',
    });
    expect(api.createMediaUpload).not.toHaveBeenCalled();
  });

  it('maps API failures without upstream details', async () => {
    api.createMediaUpload.mockResolvedValue({
      ok: false,
      status: 404,
      code: 'not_found',
      message: 'Site wine not found',
      requestId: 'r1',
    });
    expect(await declareMediaUploadAction('nails', valid)).toMatchObject({
      ok: false,
      requestId: 'r1',
    });
  });
});

describe('completeMediaAction / deleteMediaAction', () => {
  it('complete: refreshes the page; refuses an id that is not a UUID', async () => {
    expect(await completeMediaAction('nails', ID)).toMatchObject({
      ok: true,
      data: { status: 'ready' },
    });
    expect(cache.refresh).toHaveBeenCalled();
    expect(await completeMediaAction('nails', 'x/../y')).toMatchObject({
      ok: false,
      code: 'not_found',
    });
    expect(api.completeMedia).toHaveBeenCalledTimes(1);
  });

  it('delete: passes 409 media_in_use through', async () => {
    api.deleteMedia.mockResolvedValue({
      ok: false,
      status: 409,
      code: 'media_in_use',
      message: 'In use',
    });
    expect(await deleteMediaAction('nails', ID)).toMatchObject({
      ok: false,
      code: 'media_in_use',
    });
    expect(cache.refresh).not.toHaveBeenCalled();
  });
});

describe('generateMediaAction', () => {
  const input = {
    prompt: '  A bright laundromat ',
    aspectRatio: '16:9',
    count: 2,
  };

  it('forwards only prompt, ratio and count (trimmed), rate limited', async () => {
    api.generateMedia.mockResolvedValue({
      ok: true,
      data: { jobId: ID, status: 'pending', media: [], remaining: 48 },
    });
    const result = await generateMediaAction('nails', {
      ...input,
      siteId: 'wine',
      provider: 'claude',
    });
    expect(result.ok).toBe(true);
    expect(api.generateMedia).toHaveBeenCalledWith('nails', {
      prompt: 'A bright laundromat',
      aspectRatio: '16:9',
      count: 2,
    });
    expect(limit.limitAction).toHaveBeenCalled();
  });

  it('refuses invalid input, a bad site or no session without calling the API', async () => {
    for (const bad of [
      { ...input, prompt: '   ' },
      { ...input, prompt: 'x'.repeat(1001) },
      { ...input, aspectRatio: '2:1' },
      { ...input, count: 5 },
      { ...input, count: 0 },
    ]) {
      expect((await generateMediaAction('nails', bad)).ok).toBe(false);
    }
    expect((await generateMediaAction('../wine', input)).ok).toBe(false);
    session.getSessionUser.mockResolvedValue(null);
    expect(await generateMediaAction('nails', input)).toMatchObject({
      ok: false,
      code: 'unauthenticated',
    });
    expect(api.generateMedia).not.toHaveBeenCalled();
  });

  it('maps the quota refusal', async () => {
    api.generateMedia.mockResolvedValue({
      ok: false,
      status: 422,
      code: 'quota_exceeded',
      message: 'x',
    });
    expect(await generateMediaAction('nails', input)).toMatchObject({
      ok: false,
      code: 'quota_exceeded',
    });
  });
});

describe('getMediaGenerationAction', () => {
  it('polls a UUID job of a valid site only, without spending the rate limit', async () => {
    api.getMediaGeneration.mockResolvedValue({
      ok: true,
      data: { jobId: ID, status: 'completed', media: [], remaining: 1 },
    });
    expect((await getMediaGenerationAction('nails', ID)).ok).toBe(true);
    expect(api.getMediaGeneration).toHaveBeenCalledWith('nails', ID);
    expect(limit.limitAction).not.toHaveBeenCalled();
    expect((await getMediaGenerationAction('nails', '../x')).ok).toBe(false);
    expect(api.getMediaGeneration).toHaveBeenCalledTimes(1);
  });
});
