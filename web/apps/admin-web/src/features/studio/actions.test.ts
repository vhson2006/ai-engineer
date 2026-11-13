import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createStudioAvatar: vi.fn(),
  createStudioProject: vi.fn(),
  deleteStudioAvatar: vi.fn(),
  deleteStudioProject: vi.fn(),
  requestStudioRender: vi.fn(),
  requestStudioScript: vi.fn(),
  requestStudioVoice: vi.fn(),
  saveStudioBrandKit: vi.fn(),
  updateStudioAvatar: vi.fn(),
  updateStudioProject: vi.fn(),
}));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);
const idem = vi.hoisted(() => ({ once: vi.fn((_key: string, run: () => unknown) => run()) }));
vi.mock('@web/core/actions/idempotency', () => idem);
vi.mock('next/cache', () => ({ refresh: vi.fn() }));

const {
  createStudioAvatarAction,
  createStudioProjectAction,
  saveStudioBrandAction,
  saveStudioInputsAction,
  saveStudioScriptAction,
  startStudioStepAction,
} = await import('./actions');

const ID = '4f9b2c1e-8a3d-4e5f-9b6c-1d2e3f4a5b6c';
const MEDIA = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const SUBMISSION = '0b30bc39-b265-47bb-91e3-5a3d2a254935';
const ok = { ok: true, data: { id: ID } };

beforeEach(() => {
  vi.clearAllMocks();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Dana', username: 'dana', roles: [] });
  for (const fn of Object.values(api)) fn.mockResolvedValue(ok);
});

describe('studio actions', () => {
  it('creates a project from the template only, once per submission', async () => {
    const result = await createStudioProjectAction('nails', {
      submissionId: SUBMISSION,
      templateId: 'price-hook',
      title: ' Giá ',
      language: 'vi',
      inputs: { images: { hero: 'not-checked-here' } },
      createdBy: 'someone-else',
    });
    expect(result).toEqual({ ok: true, data: { id: ID } });
    expect(api.createStudioProject).toHaveBeenCalledWith('nails', {
      templateId: 'price-hook',
      title: 'Giá',
      language: 'vi',
      inputs: { images: {}, avatars: {}, voices: {}, facts: {} },
    });
    expect(idem.once).toHaveBeenCalledWith(`studio:create:user-1:${SUBMISSION}`, expect.any(Function));
  });

  it('keeps only filled slots; refuses a non-uuid image without calling the API', async () => {
    await saveStudioInputsAction('nails', ID, {
      title: 'Giá',
      brief: '',
      images: { hero: MEDIA, detail2: '' },
      avatars: {},
      voices: { narrator: 'Kore' },
      facts: { price: ' 35.000đ ' },
    });
    expect(api.updateStudioProject).toHaveBeenCalledWith('nails', ID, {
      title: 'Giá',
      brief: null,
      inputs: { images: { hero: MEDIA }, avatars: {}, voices: { narrator: 'Kore' }, facts: { price: '35.000đ' }, narration: false },
    });

    api.updateStudioProject.mockClear();
    await saveStudioInputsAction('nails', ID, { title: 'x', brief: '', images: {}, avatars: {}, voices: {}, facts: {}, narration: true });
    expect(api.updateStudioProject).toHaveBeenCalledWith(
      'nails',
      ID,
      expect.objectContaining({ inputs: expect.objectContaining({ narration: true }) }),
    );

    api.updateStudioProject.mockClear();
    const refused = await saveStudioInputsAction('nails', ID, {
      title: 'x',
      brief: '',
      images: { hero: '../../etc' },
      avatars: {},
      voices: {},
      facts: {},
    });
    expect(refused.ok).toBe(false);
    expect(api.updateStudioProject).not.toHaveBeenCalled();
  });

  it('sends the script field by field, hashtags split', async () => {
    await saveStudioScriptAction('nails', ID, {
      hooks: ['A', ' '],
      scenes: [{ id: 'hook', voice: 'A', onScreen: 'a', extra: 'x' }],
      caption: 'c',
      hashtags: 'giat say #sfaster',
    });
    expect(api.updateStudioProject).toHaveBeenCalledWith('nails', ID, {
      script: { hooks: ['A'], scenes: [{ id: 'hook', voice: 'A', onScreen: 'a' }], caption: 'c', hashtags: ['#giat', '#say', '#sfaster'] },
    });
  });

  it('starts only the known steps, on valid ids', async () => {
    await startStudioStepAction('nails', ID, 'render');
    expect(api.requestStudioRender).toHaveBeenCalledWith('nails', ID);
    expect((await startStudioStepAction('nails', ID, 'publish')).ok).toBe(false);
    expect((await startStudioStepAction('../wine', ID, 'script')).ok).toBe(false);
    expect((await startStudioStepAction('nails', 'x', 'script')).ok).toBe(false);
    expect(api.requestStudioScript).not.toHaveBeenCalled();
  });

  it('refuses everything when signed out or rate limited', async () => {
    session.getSessionUser.mockResolvedValue(null);
    expect((await startStudioStepAction('nails', ID, 'script')).ok).toBe(false);
    session.getSessionUser.mockResolvedValue({ id: 'user-1' });
    limit.limitAction.mockResolvedValue({ ok: false, code: 'rate_limited', message: 'Too many', retryAfterS: 10 });
    expect(await startStudioStepAction('nails', ID, 'script')).toMatchObject({ code: 'rate_limited' });
    expect(api.requestStudioScript).not.toHaveBeenCalled();
  });

  it('brand kit: banned phrases one per line, empty strings become null', async () => {
    await saveStudioBrandAction('nails', {
      brandName: 'Envy',
      tagline: '',
      phone: '(919) 366-6435',
      callToAction: '',
      tone: '',
      footerNote: '',
      bannedPhrases: 'best in town\n\n best in town \ncheapest',
      primaryColor: '#263238',
      accentColor: '#f06292',
      logoMediaId: '',
    });
    expect(api.saveStudioBrandKit).toHaveBeenCalledWith('nails', {
      brandName: 'Envy',
      tagline: null,
      phone: '(919) 366-6435',
      callToAction: null,
      tone: null,
      footerNote: null,
      bannedPhrases: ['best in town', 'cheapest'],
      primaryColor: '#263238',
      accentColor: '#f06292',
      logoMediaId: null,
    });
    expect((await saveStudioBrandAction('nails', { brandName: 'x', primaryColor: 'red' })).ok).toBe(false);
  });

  it('avatar: needs a face, a voice and a real consent note', async () => {
    const refused = await createStudioAvatarAction('nails', {
      submissionId: SUBMISSION,
      name: 'Lan',
      mediaId: MEDIA,
      voice: 'Kore',
      consentNote: 'ok',
    });
    expect(refused.ok).toBe(false);
    await createStudioAvatarAction('nails', {
      submissionId: SUBMISSION,
      name: 'Lan',
      mediaId: MEDIA,
      voice: 'Kore',
      consentNote: 'Chị Lan đồng ý bằng văn bản ngày 12/11/2026',
    });
    expect(api.createStudioAvatar).toHaveBeenCalledWith('nails', {
      name: 'Lan',
      mediaId: MEDIA,
      voice: 'Kore',
      consentNote: 'Chị Lan đồng ý bằng văn bản ngày 12/11/2026',
    });
  });
});
