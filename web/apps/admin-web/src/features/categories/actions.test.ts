import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn() }));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
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

const { createCategoryAction, updateCategoryAction, deleteCategoryAction } = await import('./actions');

const ID = '4f9b2c1e-8a3d-4e5f-9b6c-1d2e3f4a5b6c';
const valid = {
  submissionId: '7d1f6a52-3c1e-4c2a-9f5e-0b6a3f1d2e4c',
  key: 'care',
  position: 2,
  translations: [
    { locale: 'vi', name: ' Chăm sóc ', slug: 'cham-soc' },
    { locale: 'en', name: 'Care', slug: 'care' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  memory.clear();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Dana', username: 'dana', roles: [] });
  api.createCategory.mockResolvedValue({ ok: true, data: { id: ID } });
  api.updateCategory.mockResolvedValue({ ok: true, data: { id: ID } });
  api.deleteCategory.mockResolvedValue({ ok: true, data: undefined });
});

describe('category actions', () => {
  it('creates with exactly the validated fields, once per submission', async () => {
    expect(await createCategoryAction('nails', { ...valid, siteId: 'wine' })).toEqual({ ok: true, data: { id: ID } });
    await createCategoryAction('nails', valid);
    expect(api.createCategory).toHaveBeenCalledOnce();
    expect(api.createCategory).toHaveBeenCalledWith('nails', {
      key: 'care',
      position: 2,
      translations: [
        { locale: 'vi', name: 'Chăm sóc', slug: 'cham-soc' },
        { locale: 'en', name: 'Care', slug: 'care' },
      ],
    });
  });

  it.each([
    ['a bad key', { ...valid, key: 'Care!' }, 'key', 'invalidSlug'],
    ['a negative position', { ...valid, position: -1 }, 'position', 'tooSmall'],
    ['an empty name', { ...valid, translations: [{ locale: 'vi', name: ' ', slug: 'x' }] }, 'translations.0.name', 'required'],
  ])('refuses %s', async (_case, input, field, message) => {
    const result = await createCategoryAction('nails', input);
    expect(!result.ok && result.errors).toContainEqual({ field, message });
    expect(api.createCategory).not.toHaveBeenCalled();
  });

  it('updates and deletes by site + uuid only', async () => {
    expect(await updateCategoryAction('nails', ID, valid)).toMatchObject({ ok: true });
    expect(await updateCategoryAction('nails', ID, { ...valid, submissionId: '' })).toMatchObject({ ok: true }); // regression
    expect(await updateCategoryAction('nails', 'x', valid)).toMatchObject({ ok: false, code: 'not_found' });
    expect(await deleteCategoryAction('nails', ID)).toEqual({ ok: true, data: null });
    expect(api.updateCategory).toHaveBeenCalledTimes(2);
  });

  it('a topic still in use: the API code is kept (the dialog explains it)', async () => {
    api.deleteCategory.mockResolvedValue({ ok: false, status: 422, code: 'foreign_key_violation', message: 'In use', requestId: 'r' });
    expect(await deleteCategoryAction('nails', ID)).toMatchObject({ ok: false, code: 'foreign_key_violation' });
  });

  it('signed out → nothing sent', async () => {
    session.getSessionUser.mockResolvedValue(null);
    expect(await deleteCategoryAction('nails', ID)).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(api.deleteCategory).not.toHaveBeenCalled();
  });
});
