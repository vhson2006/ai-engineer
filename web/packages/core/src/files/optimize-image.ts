/**
 * Image optimization IN THE BROWSER before an upload to the media library (ADR 0034): the bytes
 * never reach our servers, and the CDN only ever serves small, clean files.
 *
 *  - decoded with the photo's orientation applied, then re-encoded: EXIF (GPS position, camera)
 *    and any other metadata are gone;
 *  - WebP (quality 0.82), or JPEG where the browser can't encode WebP (older Safari);
 *  - up to three widths (MEDIA_WIDTHS, never wider than the original) for <img srcset>;
 *  - each size under MEDIA_MAX_BYTES (quality lowered step by step if needed).
 *
 * The limits mirror libs/common/src/contracts/content/content.media.ts; the API checks them again.
 */

export const MEDIA_WIDTHS = [640, 1280, 1920] as const;
export const MEDIA_MAX_HEIGHT = 4800;
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
/** What may be picked: decodable by every current browser. Never SVG (it runs scripts). */
export const MEDIA_INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
/** A phone photo is 3-12 MB; refuse bigger files before decoding them. */
export const MEDIA_MAX_INPUT_BYTES = 40 * 1024 * 1024;

export type MediaOutputType = 'image/webp' | 'image/jpeg';

export interface OptimizedSize {
  width: number;
  height: number;
  blob: Blob;
}

export interface OptimizedImage {
  contentType: MediaOutputType;
  /** Narrowest first. */
  sizes: OptimizedSize[];
}

/** Why a file can't be optimized (the UI shows a translated message per code). */
export type OptimizeErrorCode = 'unsupported_type' | 'too_large' | 'decode_failed' | 'encode_failed';

export class OptimizeImageError extends Error {
  constructor(readonly code: OptimizeErrorCode) {
    super(code);
  }
}

/**
 * The sizes to make from a `width` × `height` image: each width of MEDIA_WIDTHS narrower than the
 * image, then the image's own width (at most the largest), all no taller than MEDIA_MAX_HEIGHT.
 */
export function plannedSizes(width: number, height: number): { width: number; height: number }[] {
  const tallest = Math.floor((MEDIA_MAX_HEIGHT * width) / height); // widest width within the height limit
  const largest = Math.min(width, MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1], tallest);
  const widths = [...MEDIA_WIDTHS.filter((w) => w < largest), largest];
  return widths.map((w) => ({ width: w, height: Math.max(1, Math.round((height * w) / width)) }));
}

/** Throws OptimizeImageError. Browser only (createImageBitmap, canvas). */
export async function optimizeImage(file: Blob): Promise<OptimizedImage> {
  if (!(MEDIA_INPUT_TYPES as readonly string[]).includes(file.type)) throw new OptimizeImageError('unsupported_type');
  if (file.size > MEDIA_MAX_INPUT_BYTES) throw new OptimizeImageError('too_large');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new OptimizeImageError('decode_failed');
  }
  try {
    const plan = plannedSizes(bitmap.width, bitmap.height);
    // A browser without a WebP encoder answers PNG instead: then JPEG for every size.
    const probe = await encode(bitmap, plan[0], 'image/webp');
    const contentType: MediaOutputType = probe.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const sizes: OptimizedSize[] = [];
    for (const [index, size] of plan.entries()) {
      const first = index === 0 && contentType === 'image/webp' ? probe : await encode(bitmap, size, contentType);
      sizes.push({ ...size, blob: await fitBudget(bitmap, size, contentType, first) });
    }
    return { contentType, sizes };
  } finally {
    bitmap.close();
  }
}

/** Lower the quality until the size fits MEDIA_MAX_BYTES (rare: only huge, noisy photos). */
async function fitBudget(bitmap: ImageBitmap, size: { width: number; height: number }, type: MediaOutputType, blob: Blob) {
  for (const quality of [0.7, 0.6, 0.5]) {
    if (blob.size <= MEDIA_MAX_BYTES) return blob;
    blob = await encode(bitmap, size, type, quality);
  }
  if (blob.size > MEDIA_MAX_BYTES) throw new OptimizeImageError('too_large');
  return blob;
}

async function encode(
  bitmap: ImageBitmap,
  { width, height }: { width: number; height: number },
  type: MediaOutputType,
  quality = type === 'image/webp' ? 0.82 : 0.85,
): Promise<Blob> {
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new OptimizeImageError('encode_failed');
  if (type === 'image/jpeg') {
    // JPEG has no transparency: white behind transparent PNG/WebP areas, not black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  const blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type, quality })
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new OptimizeImageError('encode_failed');
  return blob;
}

function makeCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
