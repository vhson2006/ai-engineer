import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { salon } from '@/content/salon';

/**
 * The link preview card (Open Graph + Twitter, 1200×630) in the site's bento look: porcelain
 * white, the "ENVY" wordmark, the hero headline and four pastel tiles holding gallery looks.
 * The photos are the website's gallery images (see salon.ts: shown as looks, never "our work").
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// `next dev`/`next build` and the standalone server.js run with the app folder as cwd;
// next.config.ts traces these files into the standalone output.
const fonts = join(process.cwd(), '../../packages/ui/assets/fonts');
const images = join(process.cwd(), 'public/images');

const INK = '#263238';
const TILES = [
  { file: 'gallery/envy-8.png', type: 'image/png', fill: '#f3e5f5' },
  { file: 'gallery/envy-3.png', type: 'image/png', fill: '#fce4ec' },
  { file: 'gallery/envy-2.png', type: 'image/png', fill: '#e0f2f1' },
  { file: 'gallery/envy-10.jpg', type: 'image/jpeg', fill: '#e3f2fd' },
];

const dataUrl = async (file: string, type: string) => `data:${type};base64,${(await readFile(join(images, file))).toString('base64')}`;

export async function ogCard({ kicker, title, accent, footer }: { kicker: string; title: string; accent: string; footer: string }): Promise<ArrayBuffer> {
  const [regular, bold, logo, ...photos] = await Promise.all([
    readFile(join(fonts, 'Geist-Regular.ttf')),
    readFile(join(fonts, 'Geist-Bold.ttf')),
    dataUrl('logo-envy.png', 'image/png'),
    ...TILES.map((tile) => dataUrl(tile.file, tile.type)),
  ]);
  const response = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', gap: 28, padding: 40, background: '#f4f6f7', color: INK, fontFamily: 'Geist' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderRadius: 36,
            padding: '44px 48px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={logo} width={250} height={100} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: '#4db6ac', letterSpacing: 2, textTransform: 'uppercase' }}>{kicker}</div>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.02, marginTop: 14, letterSpacing: -2 }}>{title}</div>
            <div style={{ display: 'flex', fontSize: accent.length > 20 ? 44 : 52, fontWeight: 700, lineHeight: 1.1, color: '#546e7a', letterSpacing: -1 }}>{accent}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#546e7a' }}>
            <div style={{ display: 'flex' }}>{salon.website.display.replace(/^www\./, '')}</div>
            <div style={{ display: 'flex', fontWeight: 700, color: INK }}>{footer}</div>
          </div>
        </div>
        <div style={{ width: 470, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {TILES.map((tile, i) => (
            <div key={tile.file} style={{ width: 225, height: 265, display: 'flex', borderRadius: 30, background: tile.fill, padding: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
              <img src={photos[i]} width={201} height={241} alt="" style={{ borderRadius: 22, objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
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

export async function ogResponse(png: Promise<ArrayBuffer>) {
  return new Response(await png, {
    headers: { 'Content-Type': OG_CONTENT_TYPE, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
