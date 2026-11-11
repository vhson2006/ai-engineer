import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  publishArticle: vi.fn(),
  unpublishArticle: vi.fn(),
  deleteArticle: vi.fn(),
}));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/cache', () => cache);
// once() with an in-memory store (no Redis): the real implementation, deterministic.
const memory = vi.hoisted(() => new Map<string, string>());
vi.mock('@web/core/actions/idempotency', async (importOriginal) => {
  const real = await importOriginal<typeof import('@web/core/actions/idempotency')>();
  const store = {
    claim: async (key: string, value: string) => (memory.has(key) ? false : (memory.set(key, value), true)),
    get: async (key: string) => memory.get(key) ?? null,
    set: async (key: string, value: string) => void memory.set(key, value),
    del: async (key: string) => void memory.delete(key),
  };
  return { ...real, once: (scope: string, action: () => Promise<unknown>) => real.once(scope, action as never, { store }) };
});

const { createArticleAction, updateArticleAction, publishArticleAction, unpublishArticleAction, deleteArticleAction } = await import('./actions');

const ID = '4f9b2c1e-8a3d-4e5f-9b6c-1d2e3f4a5b6c';
const CATEGORY = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const empty = (locale: string) => ({ locale, title: '', slug: '', excerpt: '', body: '', coverAlt: '', seoTitle: '', seoDescription: '' });
const en = {
  locale: 'en',
  title: ' Five habits ',
  slug: 'five-habits',
  excerpt: 'Short',
  body: '<p>Hello</p>',
  coverAlt: '',
  seoTitle: ' SEO ',
  seoDescription: '',
};
const valid = {
  submissionId: '7d1f6a52-3c1e-4c2a-9f5e-0b6a3f1d2e4c',
  categoryId: CATEGORY,
  featured: true,
  translations: [empty('vi'), en],
};
const article = { ok: true, data: { id: ID, status: 'draft' } };

beforeEach(() => {
  vi.resetAllMocks();
  memory.clear();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Dana', username: 'dana', roles: [] });
  for (const fn of [api.createArticle, api.updateArticle, api.publishArticle, api.unpublishArticle]) fn.mockResolvedValue(article);
  api.deleteArticle.mockResolvedValue({ ok: true, data: undefined });
});

describe('createArticleAction', () => {
  it('sends only the languages started, field by field (trimmed, empty optional → null)', async () => {
    const result = await createArticleAction('nails', { ...valid, status: 'published', createdBy: 'x' });

    expect(result).toEqual({ ok: true, data: { id: ID, status: 'draft' } });
    expect(api.createArticle).toHaveBeenCalledWith('nails', {
      categoryId: CATEGORY,
      featured: true,
      translations: [
        { locale: 'en', title: 'Five habits', slug: 'five-habits', excerpt: 'Short', body: '<p>Hello</p>', coverAlt: null, seoTitle: 'SEO', seoDescription: null },
      ],
    });
    expect(cache.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ['no language started', { ...valid, translations: [empty('vi'), empty('en')] }, 'translations', 'atLeastOneLanguage'],
    ['a started language without title', { ...valid, translations: [{ ...en, title: ' ' }] }, 'translations.0.title', 'required'],
    ['an empty body', { ...valid, translations: [{ ...en, body: '<p> </p>' }] }, 'translations.0.body', 'required'],
    ['a bad slug', { ...valid, translations: [{ ...en, slug: 'Bad Slug' }] }, 'translations.0.slug', 'invalidSlug'],
    ['a long title', { ...valid, translations: [{ ...en, title: 'a'.repeat(201) }] }, 'translations.0.title', 'tooLong'],
    ['no topic', { ...valid, categoryId: '' }, 'categoryId', 'required'],
    ['the same language twice', { ...valid, translations: [en, en] }, 'translations.1.locale', 'invalid'],
  ])('refuses %s without calling the API', async (_case, input, field, message) => {
    const result = await createArticleAction('nails', input);
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(!result.ok && result.errors).toContainEqual({ field, message });
    expect(api.createArticle).not.toHaveBeenCalled();
  });

  it('refuses a site id that is not a slug (it goes into the API path)', async () => {
    expect(await createArticleAction('../deployments', valid)).toMatchObject({ ok: false, code: 'not_found' });
    expect(api.createArticle).not.toHaveBeenCalled();
  });

  it('signed out → unauthenticated, nothing sent', async () => {
    session.getSessionUser.mockResolvedValue(null);
    expect(await createArticleAction('nails', valid)).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(api.createArticle).not.toHaveBeenCalled();
  });

  it('rate limited → the limiter result, nothing sent', async () => {
    limit.limitAction.mockResolvedValue({ ok: false, code: 'rate_limited', message: 'Slow down', retryAfterS: 30 });
    expect(await createArticleAction('nails', valid)).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(api.createArticle).not.toHaveBeenCalled();
  });

  it('the same submission twice creates one article', async () => {
    await createArticleAction('nails', valid);
    expect(await createArticleAction('nails', valid)).toEqual({ ok: true, data: { id: ID, status: 'draft' } });
    expect(api.createArticle).toHaveBeenCalledOnce();
  });

  it('puts API field errors back on the form language (only "en" was sent, it is the 2nd tab)', async () => {
    api.createArticle.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'validation_error',
      message: 'Invalid',
      requestId: 'req-1',
      errors: [{ field: 'translations[0].slug', message: 'slug is taken' }, { field: 'categoryId', message: 'x' }],
    });
    const result = await createArticleAction('nails', valid);
    expect(result).toMatchObject({
      ok: false,
      code: 'validation_error',
      requestId: 'req-1',
      errors: [{ field: 'translations.1.slug', message: 'slug is taken' }, { field: 'categoryId', message: 'x' }],
    });
  });

  it('a 409 (slug taken) keeps the code, message and request id', async () => {
    api.createArticle.mockResolvedValue({ ok: false, status: 409, code: 'unique_violation', message: 'Already exists', requestId: 'req-2' });
    expect(await createArticleAction('nails', valid)).toEqual({
      ok: false,
      code: 'unique_violation',
      message: 'Already exists',
      requestId: 'req-2',
      errors: undefined,
    });
  });
});

describe('updateArticleAction', () => {
  it('PATCHes the site + id with the validated fields; no submission id needed', async () => {
    expect(await updateArticleAction('nails', ID, { ...valid, submissionId: undefined })).toMatchObject({ ok: true });
    expect(api.updateArticle).toHaveBeenCalledWith('nails', ID, expect.objectContaining({ categoryId: CATEGORY, featured: true }));
  });

  it('an edit with an empty submission id (no id on edits) is accepted: regression', async () => {
    const result = await updateArticleAction('nails', ID, { ...valid, submissionId: '', translations: [{ ...en, locale: 'vi' }, en] });
    expect(result).toMatchObject({ ok: true });
    expect(api.updateArticle).toHaveBeenCalledWith('nails', ID, expect.objectContaining({ translations: expect.arrayContaining([expect.objectContaining({ locale: 'en' })]) }));
  });

    it('refuses an id that is not a uuid', async () => {
    expect(await updateArticleAction('nails', '1 OR 1=1', valid)).toMatchObject({ ok: false, code: 'not_found' });
    expect(api.updateArticle).not.toHaveBeenCalled();
  });
});

describe('publishing', () => {
  it('publishes now, or at an ISO date', async () => {
    await publishArticleAction('nails', ID, {});
    expect(api.publishArticle).toHaveBeenLastCalledWith('nails', ID, undefined);
    await publishArticleAction('nails', ID, { at: '2026-12-01T08:00:00.000Z' });
    expect(api.publishArticle).toHaveBeenLastCalledWith('nails', ID, '2026-12-01T08:00:00.000Z');
  });

  it('refuses a date that is not ISO', async () => {
    const result = await publishArticleAction('nails', ID, { at: 'tomorrow' });
    expect(!result.ok && result.errors).toContainEqual({ field: 'at', message: 'invalidDate' });
    expect(api.publishArticle).not.toHaveBeenCalled();
  });

  it('missing languages: the API 422 is passed on', async () => {
    api.publishArticle.mockResolvedValue({ ok: false, status: 422, code: 'missing_translations', message: 'missing vi', requestId: 'r' });
    expect(await publishArticleAction('nails', ID, {})).toMatchObject({ ok: false, code: 'missing_translations' });
  });

  it('unpublishes and deletes by site + id', async () => {
    expect(await unpublishArticleAction('nails', ID)).toMatchObject({ ok: true });
    expect(api.unpublishArticle).toHaveBeenCalledWith('nails', ID);
    expect(await deleteArticleAction('nails', ID)).toEqual({ ok: true, data: null });
    expect(api.deleteArticle).toHaveBeenCalledWith('nails', ID);
  });
});
