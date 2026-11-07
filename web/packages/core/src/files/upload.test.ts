import { describe, expect, it, vi } from 'vitest';
import type { StoredFile, UploadTicket } from './index';
import { createUploader, type PutOutcome, type UploaderDeps } from './upload';

const ticket: UploadTicket = {
  fileId: '7d1f6a52-3c1e-4c2a-9f5e-0b6a3f1d2e4c',
  url: 'http://storage.test/bucket/key?X-Amz-Signature=abc',
  headers: { 'Content-Type': 'application/pdf', 'Content-Length': '5' },
  expiresAt: '2026-11-06T10:00:00.000Z',
};
const stored = { id: ticket.fileId, status: 'uploaded' } as StoredFile;
const pdf = (name = 'report.pdf', type = 'application/pdf', body = 'hello') => new File([body], name, { type });

function setup(puts: PutOutcome[], overrides: Partial<UploaderDeps> = {}) {
  const start = vi.fn<UploaderDeps['start']>(async () => ({ ok: true, data: ticket }));
  const finish = vi.fn<UploaderDeps['finish']>(async () => ({ ok: true, data: stored }));
  const put = vi.fn<NonNullable<UploaderDeps['put']>>(async (_t, body, { onProgress }) => {
    onProgress?.(body.size, body.size);
    return puts.shift() ?? { kind: 'ok' };
  });
  const sleeps: number[] = [];
  const upload = createUploader({
    start,
    finish,
    put,
    sleep: async (ms) => void sleeps.push(ms),
    ...overrides,
  });
  return { upload, start, finish, put, sleeps };
}

describe('uploadFile', () => {
  it('start → PUT (signed headers, the file itself) → finish; reports phases and progress', async () => {
    const { upload, start, put, finish } = setup([]);
    const phases: string[] = [];
    const progress: number[] = [];
    const file = pdf();

    const result = await upload(file, 'deployment-attachment', {
      onPhase: (p) => phases.push(p),
      onProgress: (loaded, total) => progress.push(loaded / total),
    });

    expect(result).toEqual({ ok: true, file: stored });
    expect(start).toHaveBeenCalledWith({ purpose: 'deployment-attachment', filename: 'report.pdf', contentType: 'application/pdf', size: 5 });
    expect(put.mock.calls[0][0]).toBe(ticket);
    expect(put.mock.calls[0][1]).toBe(file);
    expect(finish).toHaveBeenCalledWith(ticket.fileId);
    expect(phases).toEqual(['preparing', 'uploading', 'verifying']);
    expect(progress).toEqual([1]);
  });

  it('declares the type from the extension when the browser gives a vendor type (Windows .csv)', async () => {
    const { upload, start } = setup([]);
    await upload(pdf('data.csv', 'application/vnd.ms-excel'), 'deployment-attachment');
    expect(start.mock.calls[0][0].contentType).toBe('text/csv');
  });

  it('refuses a file that is too large or of a wrong type BEFORE calling the server', async () => {
    const { upload, start } = setup([]);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' });

    expect(await upload(big, 'public-image')).toMatchObject({ ok: false, code: 'invalid_file' });
    expect(await upload(pdf('page.html', 'text/html'), 'deployment-attachment')).toMatchObject({ ok: false, code: 'invalid_file' });
    expect(await upload(pdf('empty.pdf', 'application/pdf', ''), 'deployment-attachment')).toMatchObject({ code: 'invalid_file' });
    expect(start).not.toHaveBeenCalled();
  });

  it('API refusal at start (validation, signed out) is returned as is; nothing is sent', async () => {
    const refused = { ok: false as const, code: 'unauthenticated', message: 'Your session has expired.', requestId: 'r1' };
    const { upload, put } = setup([], { start: async () => refused });
    expect(await upload(pdf(), 'deployment-attachment')).toEqual(refused);
    expect(put).not.toHaveBeenCalled();
  });

  it('PUT: network error and 503 are retried with backoff (same signed URL)', async () => {
    const { upload, put, sleeps } = setup([{ kind: 'network' }, { kind: 'http', status: 503 }, { kind: 'ok' }]);
    expect((await upload(pdf(), 'deployment-attachment')).ok).toBe(true);
    expect(put).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([500, 1000]);
  });

  it('PUT: gives up after the retries → upload_failed, finish never called', async () => {
    const { upload, finish } = setup([{ kind: 'network' }, { kind: 'network' }, { kind: 'network' }]);
    expect(await upload(pdf(), 'deployment-attachment')).toMatchObject({ ok: false, code: 'upload_failed' });
    expect(finish).not.toHaveBeenCalled();
  });

  it('PUT: 403 (expired link / tampered headers) is not retried → upload_rejected', async () => {
    const { upload, put } = setup([{ kind: 'http', status: 403 }]);
    expect(await upload(pdf(), 'deployment-attachment')).toMatchObject({ ok: false, code: 'upload_rejected' });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('finish refused by the API (upload_mismatch) is returned with its request id', async () => {
    const mismatch = { ok: false as const, code: 'upload_mismatch', message: 'does not match', requestId: 'r2' };
    const { upload } = setup([], { finish: async () => mismatch });
    expect(await upload(pdf(), 'deployment-attachment')).toEqual(mismatch);
  });

  it('cancel: an aborted signal stops before the PUT, and an aborted PUT is not retried', async () => {
    const controller = new AbortController();
    controller.abort();
    const first = setup([]);
    expect(await first.upload(pdf(), 'deployment-attachment', { signal: controller.signal })).toMatchObject({ code: 'aborted' });
    expect(first.start).not.toHaveBeenCalled();

    const second = setup([{ kind: 'aborted' }]);
    expect(await second.upload(pdf(), 'deployment-attachment')).toMatchObject({ code: 'aborted' });
    expect(second.put).toHaveBeenCalledTimes(1);
    expect(second.finish).not.toHaveBeenCalled();
  });

  it('our server unreachable (the Server Action call rejects) → network_error, never a throw', async () => {
    const { upload } = setup([], {
      start: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(await upload(pdf(), 'deployment-attachment')).toMatchObject({ ok: false, code: 'network_error' });
  });
});
