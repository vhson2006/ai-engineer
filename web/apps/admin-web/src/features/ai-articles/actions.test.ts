import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createArticleDraft: vi.fn(), writeArticleDraft: vi.fn() }));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
const idem = vi.hoisted(() => ({ once: vi.fn((_key: string, run: () => unknown) => run()) }));
vi.mock('@web/core/actions/idempotency', () => idem);
vi.mock('next/cache', () => ({ refresh: vi.fn() }));

const { startAiArticleAction, writeAiArticleAction } = await import('./actions');

const ID = '4f9b2c1e-8a3d-4e5f-9b6c-1d2e3f4a5b6c';
const CATEGORY = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const SUBMISSION = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
const brief = 'You are a professional content writer for Envy Nails Spa. Write about gel nails, short sentences.';
const idea = {
  submissionId: SUBMISSION,
  categoryId: CATEGORY,
  locale: 'en',
  idea: ' Gel that lasts ',
  audience: '',
  keyword: 'gel manicure',
  length: 'medium',
  images: '2',
};

beforeEach(() => {
  vi.clearAllMocks();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Dana', username: 'dana', roles: [] });
  for (const fn of Object.values(api)) fn.mockResolvedValue({ ok: true, data: { id: ID } });
});

describe('AI article actions', () => {
  it('starts from the idea only, field by field, once per submission', async () => {
    const result = await startAiArticleAction('nails', { ...idea, status: 'completed', createdBy: 'someone-else' });
    expect(result).toEqual({ ok: true, data: { id: ID } });
    expect(api.createArticleDraft).toHaveBeenCalledWith('nails', {
      categoryId: CATEGORY,
      locale: 'en',
      idea: 'Gel that lasts',
      keyword: 'gel manicure',
      length: 'medium',
      images: 2,
    });
    expect(idem.once).toHaveBeenCalledWith(`ai-article:create:user-1:${SUBMISSION}`, expect.any(Function));
  });

  it('refuses bad input without calling the API: too many images, unknown length, no submission, another site', async () => {
    for (const bad of [
      { ...idea, images: '9' },
      { ...idea, length: 'huge' },
      { ...idea, categoryId: 'x' },
      { ...idea, idea: 'a' },
    ]) {
      expect((await startAiArticleAction('nails', bad)).ok).toBe(false);
    }
    expect(await startAiArticleAction('nails', { ...idea, submissionId: '' })).toMatchObject({ ok: false, code: 'invalid_input' });
    expect((await startAiArticleAction('../wine', idea)).ok).toBe(false);
    expect(api.createArticleDraft).not.toHaveBeenCalled();
  });

  it('confirms the brief: the outline one heading per line; refuses a short brief or a bad id', async () => {
    await writeAiArticleAction('nails', ID, { prompt: brief, outline: ' Prep \n\nCare\n' });
    expect(api.writeArticleDraft).toHaveBeenCalledWith('nails', ID, { prompt: brief, outline: ['Prep', 'Care'] });

    api.writeArticleDraft.mockClear();
    expect((await writeAiArticleAction('nails', ID, { prompt: 'short', outline: 'A' })).ok).toBe(false);
    expect((await writeAiArticleAction('nails', ID, { prompt: brief, outline: '' })).ok).toBe(false);
    expect((await writeAiArticleAction('nails', 'x', { prompt: brief, outline: 'A' })).ok).toBe(false);
    expect(api.writeArticleDraft).not.toHaveBeenCalled();
  });

  it('refuses everything when signed out or rate limited; maps API failures', async () => {
    session.getSessionUser.mockResolvedValue(null);
    expect(await startAiArticleAction('nails', idea)).toMatchObject({ ok: false, code: 'unauthenticated' });
    session.getSessionUser.mockResolvedValue({ id: 'user-1' });
    limit.limitAction.mockResolvedValue({ ok: false, code: 'rate_limited', message: 'Too many', retryAfterS: 10 });
    expect(await writeAiArticleAction('nails', ID, { prompt: brief, outline: 'A' })).toMatchObject({ code: 'rate_limited' });
    expect(api.writeArticleDraft).not.toHaveBeenCalled();

    limit.limitAction.mockResolvedValue(null);
    api.writeArticleDraft.mockResolvedValue({
      ok: false,
      status: 422,
      code: 'quota_exceeded',
      message: 'This site wrote its 30 AI articles this month',
      requestId: 'r-1',
    });
    expect(await writeAiArticleAction('nails', ID, { prompt: brief, outline: 'A' })).toMatchObject({
      ok: false,
      code: 'quota_exceeded',
    });
  });
});
