import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createUpload: vi.fn(),
  completeUpload: vi.fn(),
  deleteFile: vi.fn(),
}));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);

const { startUpload, finishUpload, removeFile } = await import('./actions');

const ID = '7d1f6a52-3c1e-4c2a-9f5e-0b6a3f1d2e4c';
const valid = { purpose: 'deployment-attachment' as const, filename: 'a.pdf', contentType: 'application/pdf', size: 10 };

beforeEach(() => {
  vi.resetAllMocks();
  limit.limitAction.mockResolvedValue(null); // allowed
});

describe('file Server Actions', () => {
  it('startUpload returns only the upload ticket (no owner id, no storage key)', async () => {
    api.createUpload.mockResolvedValue({
      ok: true,
      data: {
        file: { id: ID, ownerId: 'user-1', status: 'pending' },
        upload: { method: 'PUT', url: 'http://s/k', headers: { 'Content-Type': 'application/pdf' }, expiresAt: 'x' },
      },
    });

    const result = await startUpload(valid);

    expect(result).toEqual({ ok: true, data: { fileId: ID, url: 'http://s/k', headers: { 'Content-Type': 'application/pdf' }, expiresAt: 'x' } });
    expect(api.createUpload).toHaveBeenCalledWith(valid);
  });

  it.each([
    ['unknown purpose', { ...valid, purpose: 'avatar' }, 'purpose'],
    ['empty filename', { ...valid, filename: '  ' }, 'filename'],
    ['long filename', { ...valid, filename: 'a'.repeat(256) }, 'filename'],
    ['bad media type', { ...valid, contentType: 'text/html; x' }, 'contentType'],
    ['negative size', { ...valid, size: -1 }, 'size'],
    ['size as string', { ...valid, size: '10' }, 'size'],
    ['not an object', null, 'input'],
  ])('startUpload refuses %s without calling the API', async (_name, input, field) => {
    const result = await startUpload(input as typeof valid);
    expect(result).toMatchObject({ ok: false, code: 'invalid_input', errors: [{ field }] });
    expect(api.createUpload).not.toHaveBeenCalled();
  });

  it('extra fields (ownerId…) are never forwarded to the API', async () => {
    api.createUpload.mockResolvedValue({ ok: false, status: 400, code: 'x', message: 'm', requestId: 'r' });
    await startUpload({ ...valid, ownerId: 'someone-else' } as typeof valid);
    expect(api.createUpload).toHaveBeenCalledWith(valid);
  });

  it('API errors keep code, message, field errors and request id (nothing else)', async () => {
    api.completeUpload.mockResolvedValue({
      ok: false,
      status: 422,
      code: 'upload_mismatch',
      message: 'does not match',
      requestId: 'req-9',
      headers: new Headers(),
    });
    expect(await finishUpload(ID)).toEqual({ ok: false, code: 'upload_mismatch', message: 'does not match', errors: undefined, requestId: 'req-9' });
  });

  it('finishUpload / removeFile refuse a non-UUID id (no path injection into the API URL)', async () => {
    expect(await finishUpload('../deployments')).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(await removeFile('x')).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(api.completeUpload).not.toHaveBeenCalled();
    expect(api.deleteFile).not.toHaveBeenCalled();
  });

  it('rate limited (per user) → rate_limited result, the API is not called', async () => {
    limit.limitAction.mockResolvedValue({ ok: false, code: 'rate_limited', message: 'Too many requests.', retryAfterS: 42 });
    expect(await startUpload(valid)).toMatchObject({ ok: false, code: 'rate_limited', retryAfterS: 42 });
    expect(await removeFile(ID)).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(api.createUpload).not.toHaveBeenCalled();
    expect(api.deleteFile).not.toHaveBeenCalled();
  });

  it('removeFile', async () => {
    api.deleteFile.mockResolvedValue({ ok: true, status: 204, data: undefined });
    expect(await removeFile(ID)).toEqual({ ok: true, data: null });
    expect(api.deleteFile).toHaveBeenCalledWith(ID);
  });
});
