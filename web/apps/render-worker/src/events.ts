import { z } from 'zod';
import { COMPOSITION_IDS, studioPropsSchema } from '@web/video';

/*
 * The render events (ADR 0039), the same shapes as `VideoRender*Event` in nest-microservice
 * (libs/common/src/contracts/content/studio.types.ts): change both together. Payloads are plain
 * JSON on the EVENTS stream; each message carries `Nats-Msg-Id` (the consumer's inbox key).
 */
export const VIDEO_RENDER_EVENTS = {
  REQUESTED: 'events.video-render.requested',
  COMPLETED: 'events.video-render.completed',
  FAILED: 'events.video-render.failed',
} as const;

export const EVENTS_STREAM = 'EVENTS';
export const DURABLE = 'render-worker';
export const MESSAGE_ID_HEADER = 'Nats-Msg-Id';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Only `studio/<siteId>/<projectId>/video/<renderId>.mp4`. */
export const OUTPUT_KEY = new RegExp(`^studio\\/[a-z0-9]+(?:-[a-z0-9]+)*\\/${UUID}\\/video\\/${UUID}\\.mp4$`);

export const renderRequestedSchema = z
  .object({
    renderId: z.string().uuid(),
    siteId: z.string().max(50),
    projectId: z.string().uuid(),
    composition: z.string().refine((id) => COMPOSITION_IDS.includes(id), 'unknown composition'),
    props: studioPropsSchema,
    outputKey: z.string().regex(OUTPUT_KEY),
  })
  // The output belongs to this site, this project and this render: nothing else can be overwritten.
  .refine((e) => e.outputKey === `studio/${e.siteId}/${e.projectId}/video/${e.renderId}.mp4`, {
    message: 'outputKey does not match the render',
    path: ['outputKey'],
  });

export type RenderRequested = z.infer<typeof renderRequestedSchema>;

/** Mirror of libs/common videoWebKeys: the web MP4 and the poster next to the output key. */
export function videoWebKeys(outputKey: string): { web: string; poster: string } {
  const base = outputKey.replace(/\.mp4$/, '');
  return { web: `${base}-web.mp4`, poster: `${base}.jpg` };
}

export interface RenderCompleted {
  renderId: string;
  siteId: string;
  key: string;
  sizeBytes: number;
  webSizeBytes: number;
  durationMs: number;
  renderMs: number;
}

export interface RenderFailed {
  renderId: string;
  siteId: string;
  reason: 'render_failed' | 'invalid_request';
  detail?: string;
}
