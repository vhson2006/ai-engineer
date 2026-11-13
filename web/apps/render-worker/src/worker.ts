import type { Logger } from 'pino';
import { assetsWithin, type StudioVideoProps } from '@web/video';
import { renderRequestedSchema, VIDEO_RENDER_EVENTS, videoWebKeys, type RenderCompleted, type RenderFailed } from './events';
import type { RenderOutput } from './renderer';

export interface RenderPort {
  render(composition: string, props: StudioVideoProps, onProgress: (progress: number) => void): Promise<RenderOutput>;
}

export interface StoragePort {
  putFile(key: string, file: string, sizeBytes: number, contentType: 'video/mp4' | 'image/jpeg'): Promise<void>;
}

export type Answer =
  | { subject: typeof VIDEO_RENDER_EVENTS.COMPLETED; id: string; payload: RenderCompleted }
  | { subject: typeof VIDEO_RENDER_EVENTS.FAILED; id: string; payload: RenderFailed }
  /** Not even a render id to answer to: dropped (logged). */
  | null;

/**
 * One render request (ADR 0039) → the answer to publish. Never throws for a bad request or a
 * failed render: the requester always gets `completed` or `failed`. Only a storage error is thrown
 * (transient: JetStream redelivers and the render runs again, writing the same key).
 */
export async function processRender(
  data: unknown,
  deps: { renderer: RenderPort; storage: StoragePort; assetOrigins: string[]; log: Logger; onProgress?: () => void },
): Promise<Answer> {
  const parsed = renderRequestedSchema.safeParse(data);
  if (!parsed.success) {
    const head = (data ?? {}) as { renderId?: unknown; siteId?: unknown };
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    deps.log.warn({ detail }, 'invalid render request');
    if (typeof head.renderId !== 'string' || typeof head.siteId !== 'string') return null;
    return failed(head.renderId, head.siteId, 'invalid_request', detail);
  }
  const event = parsed.data;
  if (!assetsWithin(event.props, deps.assetOrigins)) {
    deps.log.warn({ renderId: event.renderId }, 'render request with assets outside the storage origin');
    return failed(event.renderId, event.siteId, 'invalid_request', 'assets outside the storage origin');
  }

  const started = Date.now();
  let result: Awaited<ReturnType<RenderPort['render']>>;
  try {
    let last = -1;
    result = await deps.renderer.render(event.composition, event.props, (progress) => {
      deps.onProgress?.();
      const step = Math.floor(progress * 10);
      if (step > last) {
        last = step;
        deps.log.debug({ renderId: event.renderId, progress: step * 10 }, 'rendering');
      }
    });
  } catch (error) {
    deps.log.error({ renderId: event.renderId, err: describe(error) }, 'render failed');
    return failed(event.renderId, event.siteId, 'render_failed', describe(error));
  }
  const keys = videoWebKeys(event.outputKey);
  try {
    // The web files first: once the main MP4 exists, its web version and poster do too.
    await deps.storage.putFile(keys.web, result.web.file, result.web.sizeBytes, 'video/mp4');
    await deps.storage.putFile(keys.poster, result.poster.file, result.poster.sizeBytes, 'image/jpeg');
    await deps.storage.putFile(event.outputKey, result.video.file, result.video.sizeBytes, 'video/mp4');
  } finally {
    await result.cleanup();
  }
  const renderMs = Date.now() - started;
  deps.log.info(
    { renderId: event.renderId, siteId: event.siteId, sizeBytes: result.video.sizeBytes, webSizeBytes: result.web.sizeBytes, renderMs },
    'rendered',
  );
  return {
    subject: VIDEO_RENDER_EVENTS.COMPLETED,
    id: `render-completed:${event.renderId}`,
    payload: {
      renderId: event.renderId,
      siteId: event.siteId,
      key: event.outputKey,
      sizeBytes: result.video.sizeBytes,
      webSizeBytes: result.web.sizeBytes,
      durationMs: result.durationMs,
      renderMs,
    },
  };
}

function failed(renderId: string, siteId: string, reason: RenderFailed['reason'], detail: string): Answer {
  return {
    subject: VIDEO_RENDER_EVENTS.FAILED,
    id: `render-failed:${renderId}`,
    payload: { renderId, siteId, reason, detail: detail.slice(0, 300) },
  };
}

/** Name and message only (never a whole error object). */
export function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
}
