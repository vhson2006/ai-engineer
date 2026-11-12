import { describe, expect, it, vi } from 'vitest';
import type { Media, MediaUpload } from '../api/content';
import { createMediaUploader } from './media-upload';
import { MEDIA_MAX_HEIGHT, OptimizeImageError, plannedSizes, type OptimizedImage } from './optimize-image';

describe('plannedSizes', () => {
  it('makes the standard widths narrower than the image, then the image width (max 1920)', () => {
    expect(plannedSizes(4032, 3024)).toEqual([
      { width: 640, height: 480 },
      { width: 1280, height: 960 },
      { width: 1920, height: 1440 },
    ]);
    expect(plannedSizes(1000, 500)).toEqual([
      { width: 640, height: 320 },
      { width: 1000, height: 500 },
    ]);
    expect(plannedSizes(300, 200)).toEqual([{ width: 300, height: 200 }]);
  });

  it('keeps very tall images within the height limit', () => {
    const sizes = plannedSizes(1200, 12_000);
    expect(sizes.at(-1)!.height).toBeLessThanOrEqual(MEDIA_MAX_HEIGHT);
    expect(sizes.at(-1)!.width).toBe(480);
  });
});

describe('createMediaUploader', () => {
  const image: OptimizedImage = {
    contentType: 'image/webp',
    sizes: [
      { width: 640, height: 427, blob: new Blob(['a'.repeat(100)], { type: 'image/webp' }) },
      { width: 1280, height: 853, blob: new Blob(['b'.repeat(300)], { type: 'image/webp' }) },
    ],
  };
  const media = { id: 'm1', status: 'ready' } as Media;
  const upload: MediaUpload = {
    media: { ...media, status: 'pending' },
    uploads: [640, 1280].map((width) => ({
      width,
      method: 'PUT' as const,
      url: `https://storage.test/${width}`,
      headers: { 'Content-Type': 'image/webp' },
      expiresAt: '2026-11-12T02:00:00Z',
    })),
  };
  const file = new File(['x'], 'shop.jpg', { type: 'image/jpeg' });

  function setup(overrides: Partial<Parameters<typeof createMediaUploader>[0]> = {}) {
    const deps = {
      optimize: vi.fn().mockResolvedValue(image),
      declare: vi.fn().mockResolvedValue({ ok: true, data: upload }),
      complete: vi.fn().mockResolvedValue({ ok: true, data: media }),
      put: vi.fn().mockImplementation((_t, body: Blob, o: { onProgress?: (n: number) => void }) => {
        o.onProgress?.(body.size);
        return Promise.resolve({ kind: 'ok' });
      }),
      ...overrides,
    };
    return { deps, upload: createMediaUploader(deps) };
  }

  it('declares the optimized sizes, PUTs each to its URL, then completes', async () => {
    const { deps, upload: run } = setup();
    const progress: number[] = [];
    const result = await run(file, { onProgress: (loaded, total) => progress.push(loaded / total) });

    expect(result).toEqual({ ok: true, media });
    expect(deps.declare).toHaveBeenCalledWith({
      filename: 'shop.jpg',
      contentType: 'image/webp',
      variants: [
        { width: 640, height: 427, size: 100 },
        { width: 1280, height: 853, size: 300 },
      ],
    });
    expect(vi.mocked(deps.put).mock.calls.map(([ticket]) => (ticket as { url: string }).url)).toEqual(['https://storage.test/640', 'https://storage.test/1280']);
    expect(deps.complete).toHaveBeenCalledWith('m1');
    expect(progress.at(-1)).toBe(1);
  });

  it('stops before declaring when the image cannot be prepared', async () => {
    const { deps, upload: run } = setup({ optimize: vi.fn().mockRejectedValue(new OptimizeImageError('unsupported_type')) });
    expect(await run(file)).toMatchObject({ ok: false, code: 'unsupported_type' });
    expect(deps.declare).not.toHaveBeenCalled();
  });

  it('reports a storage refusal and never completes', async () => {
    const { deps, upload: run } = setup({ put: vi.fn().mockResolvedValue({ kind: 'http', status: 403 }) });
    expect(await run(file)).toMatchObject({ ok: false, code: 'upload_rejected' });
    expect(deps.complete).not.toHaveBeenCalled();
  });

  it('passes API failures through, and a thrown action becomes network_error', async () => {
    const refused = setup({ declare: vi.fn().mockResolvedValue({ ok: false, code: 'rate_limited', message: 'slow down', requestId: 'r1' }) });
    expect(await refused.upload(file)).toEqual({ ok: false, code: 'rate_limited', message: 'slow down', requestId: 'r1' });
    const down = setup({ complete: vi.fn().mockRejectedValue(new Error('fetch failed')) });
    expect(await down.upload(file)).toMatchObject({ ok: false, code: 'network_error' });
  });

  it('cancelled during the PUT: aborted, not completed', async () => {
    const { deps, upload: run } = setup({ put: vi.fn().mockResolvedValue({ kind: 'aborted' }) });
    expect(await run(file)).toMatchObject({ ok: false, code: 'aborted' });
    expect(deps.complete).not.toHaveBeenCalled();
  });
});
