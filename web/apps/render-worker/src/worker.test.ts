import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { VIDEO_RENDER_EVENTS } from './events';
import { processRender, type RenderPort, type StoragePort } from './worker';

const SITE = 'laundry';
const PROJECT = '2c9d6f2a-4b1e-4c3d-9a8b-7f6e5d4c3b2a';
const RENDER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const CDN = 'https://cdn.test';
const request = {
  renderId: RENDER,
  siteId: SITE,
  projectId: PROJECT,
  composition: 'price-hook',
  outputKey: `studio/${SITE}/${PROJECT}/video/${RENDER}.mp4`,
  props: {
    templateId: 'price-hook',
    fps: 30,
    width: 1080,
    height: 1920,
    brand: {
      name: 'SFaster',
      tagline: null,
      phone: null,
      callToAction: null,
      footerNote: null,
      primaryColor: '#13883a',
      accentColor: '#ffd400',
      logoUrl: null,
    },
    scenes: [
      {
        id: 'hook',
        imageUrl: `${CDN}/media/${SITE}/a/1280.webp`,
        avatarUrl: null,
        avatarMode: null,
        voiceUrl: `${CDN}/studio/${SITE}/${PROJECT}/voice/j/hook.wav`,
        voice: 'Chỉ 35.000đ',
        onScreen: '35.000đ',
        durationInFrames: 60,
      },
    ],
    endCardFrames: 45,
  },
};

function deps() {
  const cleanup = vi.fn().mockResolvedValue(undefined);
  const renderer: RenderPort = {
    render: vi.fn().mockResolvedValue({
      video: { file: '/tmp/x/video.mp4', sizeBytes: 1234 },
      web: { file: '/tmp/x/web.mp4', sizeBytes: 400 },
      poster: { file: '/tmp/x/poster.jpg', sizeBytes: 50 },
      durationMs: 3500,
      cleanup,
    }),
  };
  const storage: StoragePort = { putFile: vi.fn().mockResolvedValue(undefined) };
  return { renderer, storage, cleanup, assetOrigins: [CDN], log: pino({ level: 'silent' }) };
}

describe('processRender', () => {
  it('renders, uploads to the requested key and answers completed (temp files removed)', async () => {
    const d = deps();
    const answer = await processRender(request, d);
    expect(d.renderer.render).toHaveBeenCalledWith('price-hook', request.props, expect.any(Function));
    const base = `studio/${SITE}/${PROJECT}/video/${RENDER}`;
    // Web files first, the main MP4 last.
    expect(vi.mocked(d.storage.putFile).mock.calls).toEqual([
      [`${base}-web.mp4`, '/tmp/x/web.mp4', 400, 'video/mp4'],
      [`${base}.jpg`, '/tmp/x/poster.jpg', 50, 'image/jpeg'],
      [request.outputKey, '/tmp/x/video.mp4', 1234, 'video/mp4'],
    ]);
    expect(d.cleanup).toHaveBeenCalled();
    expect(answer).toMatchObject({
      subject: VIDEO_RENDER_EVENTS.COMPLETED,
      id: `render-completed:${RENDER}`,
      payload: { renderId: RENDER, siteId: SITE, key: request.outputKey, sizeBytes: 1234, webSizeBytes: 400, durationMs: 3500 },
    });
  });

  it('refuses an output key of another site or render, and assets outside the CDN (no render)', async () => {
    const d = deps();
    const otherKey = await processRender({ ...request, outputKey: `studio/nails/${PROJECT}/video/${RENDER}.mp4` }, d);
    expect(otherKey).toMatchObject({ subject: VIDEO_RENDER_EVENTS.FAILED, payload: { reason: 'invalid_request' } });
    const ssrf = await processRender(
      { ...request, props: { ...request.props, brand: { ...request.props.brand, logoUrl: 'http://169.254.169.254/latest' } } },
      d,
    );
    expect(ssrf).toMatchObject({ payload: { reason: 'invalid_request', detail: 'assets outside the storage origin' } });
    expect(d.renderer.render).not.toHaveBeenCalled();
  });

  it('answers failed when the render fails; throws when the upload fails (redelivered)', async () => {
    const d = deps();
    vi.mocked(d.renderer.render).mockRejectedValueOnce(new Error('chrome crashed'));
    expect(await processRender(request, d)).toMatchObject({
      payload: { reason: 'render_failed', detail: 'Error: chrome crashed' },
    });
    vi.mocked(d.storage.putFile).mockRejectedValueOnce(new Error('503'));
    await expect(processRender(request, d)).rejects.toThrow('503');
    expect(d.cleanup).toHaveBeenCalled();
  });

  it('drops a message without a render id, answers failed for an unknown composition', async () => {
    const d = deps();
    expect(await processRender({ hello: 'world' }, d)).toBeNull();
    expect(await processRender({ ...request, composition: 'nope' }, d)).toMatchObject({
      payload: { reason: 'invalid_request' },
    });
  });
});
