import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactElement } from 'react';
import { ImageResponse } from 'next/og';

/**
 * Link preview cards drawn by the site (Open Graph + Twitter, 1200×630): the kit renders, caches
 * and serves them; each site draws its own card (its brand, `src/og-card.tsx`). Routes:
 * `site.routes.ogImage` (/og/<lang>.png) and `site.routes.articleOgImage`
 * (/og/<articles>/<lang>/<slug>.png). The fonts are read at runtime: list them in the app's
 * next.config.ts `outputFileTracingIncludes` (OG_FONT_FILES).
 */
export const OG_SIZE = { width: 1200, height: 630 };

/** Geist with Vietnamese glyphs (packages/ui/assets/fonts, SIL OFL), from the app folder (cwd). */
export const OG_FONT_FILES = '../../packages/ui/assets/fonts/*.ttf';
const fontsDir = () => join(process.cwd(), '../../packages/ui/assets/fonts');

/** A file of the app's public/ folder as a data URL (photos and logos inside a card). */
export async function publicDataUrl(file: string, type: string): Promise<string> {
  return `data:${type};base64,${(await readFile(join(process.cwd(), 'public', file))).toString('base64')}`;
}

/** Renders a card (JSX for Satori: inline styles, flex layout) to PNG bytes, with Geist 400/700. */
export async function renderOgCard(card: ReactElement): Promise<ArrayBuffer> {
  const [regular, bold] = await Promise.all([readFile(join(fontsDir(), 'Geist-Regular.ttf')), readFile(join(fontsDir(), 'Geist-Bold.ttf'))]);
  const response = new ImageResponse(card, {
    ...OG_SIZE,
    fonts: [
      { name: 'Geist', data: regular, weight: 400, style: 'normal' },
      { name: 'Geist', data: bold, weight: 700, style: 'normal' },
    ],
  });
  return response.arrayBuffer();
}

/** Renders each card once per server process; a failed render is retried next time. */
export function cachedCard(cache: Map<string, Promise<ArrayBuffer>>, key: string, render: () => Promise<ArrayBuffer>) {
  let png = cache.get(key);
  if (!png) {
    png = render();
    png.catch(() => cache.delete(key));
    cache.set(key, png);
  }
  return png;
}

export async function ogResponse(png: Promise<ArrayBuffer>): Promise<Response> {
  return new Response(await png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
