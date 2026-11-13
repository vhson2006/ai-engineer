import { z } from 'zod';

/**
 * The props of every studio composition (ADR 0039): the same shape as `StudioCompositionProps`
 * in nest-microservice (libs/common/src/contracts/content/studio.types.ts): change both together.
 * content-service resolves every input to a public URL; render-worker validates the event with
 * `studioPropsSchema` (plus `assetsWithin`) before rendering; admin-web previews the same props.
 */

const MAX_FRAMES = 30 * 120; // two minutes at 30 fps: far above any template

const nullableUrl = z
  .string()
  .max(1000)
  .refine((value) => /^https?:\/\//.test(value), 'http(s) URL')
  .nullable();

export const studioSceneSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  imageUrl: nullableUrl,
  avatarUrl: nullableUrl,
  avatarMode: z.enum(['full', 'corner']).nullable(),
  voiceUrl: nullableUrl,
  voice: z.string().max(600),
  onScreen: z.string().max(200),
  durationInFrames: z.number().int().min(1).max(MAX_FRAMES),
});

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const studioPropsSchema = z.object({
  templateId: z.string().max(40),
  fps: z.number().int().min(1).max(60),
  width: z.number().int().min(16).max(3840),
  height: z.number().int().min(16).max(3840),
  brand: z.object({
    name: z.string().max(100),
    tagline: z.string().max(200).nullable(),
    phone: z.string().max(40).nullable(),
    callToAction: z.string().max(200).nullable(),
    footerNote: z.string().max(200).nullable(),
    primaryColor: color,
    accentColor: color,
    logoUrl: nullableUrl,
  }),
  scenes: z.array(studioSceneSchema).min(1).max(12),
  endCardFrames: z.number().int().min(0).max(MAX_FRAMES),
});

export type StudioVideoProps = z.infer<typeof studioPropsSchema>;
export type StudioScene = z.infer<typeof studioSceneSchema>;

/** The whole video: every scene, then the brand card. */
export function totalFrames(props: Pick<StudioVideoProps, 'scenes' | 'endCardFrames'>): number {
  return props.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) + props.endCardFrames;
}

/** Every asset URL of the props (images, faces, voices, logo). */
export function assetUrls(props: StudioVideoProps): string[] {
  return [props.brand.logoUrl, ...props.scenes.flatMap((scene) => [scene.imageUrl, scene.avatarUrl, scene.voiceUrl])].filter(
    (url): url is string => Boolean(url),
  );
}

/**
 * True when every asset is served from one of `origins` (the storage CDN): the renderer's browser
 * must never be pointed at another host (an internal address, someone else's server).
 */
export function assetsWithin(props: StudioVideoProps, origins: string[]): boolean {
  const allowed = origins.map((origin) => origin.replace(/\/+$/, '') + '/');
  return assetUrls(props).every((url) => allowed.some((origin) => url.startsWith(origin)));
}
