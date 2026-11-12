import sharp from 'sharp';

/** Same sizes as the admin's browser optimizer (ADR 0034): phone, laptop, full width. */
export const WIDTHS = [640, 1280, 1920] as const;
const QUALITY = 82;

export interface OptimizedVariant {
  width: number;
  height: number;
  data: Buffer;
}

/**
 * A generated picture → WebP sizes for the media library (ADR 0037), like an uploaded photo:
 * each width of WIDTHS narrower than the picture, then its own width (at most 1920); sharp keeps
 * no metadata by default. Narrowest first.
 */
export async function optimizeImage(input: Buffer): Promise<OptimizedVariant[]> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('not an image');
  const largest = Math.min(width, WIDTHS[WIDTHS.length - 1]);
  const widths = [...WIDTHS.filter((w) => w < largest), largest];
  return Promise.all(
    widths.map(async (w) => {
      const h = Math.max(1, Math.round((height * w) / width));
      const data = await sharp(input).resize(w, h).webp({ quality: QUALITY }).toBuffer();
      return { width: w, height: h, data };
    }),
  );
}
