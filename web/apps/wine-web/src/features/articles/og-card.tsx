import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/site';

/**
 * The link preview card (Open Graph + Twitter, 1200×630) in the brand's colors: lucky red,
 * imperial yellow, the "興" seal, a title and an optional kicker (article topic). Shared by the
 * site's and the articles' opengraph-image routes.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Geist with Vietnamese glyphs (packages/ui/assets/fonts, SIL OFL). `next dev`/`next build` and the
// standalone server.js run with the app folder as cwd; next.config.ts traces the fonts.
const fonts = join(process.cwd(), '../../packages/ui/assets/fonts');

export async function ogCard({ kicker, title, footer }: { kicker: string; title: string; footer: string }): Promise<ArrayBuffer> {
  const [regular, bold] = await Promise.all([readFile(join(fonts, 'Geist-Regular.ttf')), readFile(join(fonts, 'Geist-Bold.ttf'))]);
  const host = new URL(SITE_URL).host;
  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 76px',
          background: '#b3141c',
          backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(255,229,0,0.22) 0%, rgba(255,229,0,0) 45%)',
          color: '#ffffff',
          fontFamily: 'Geist',
          position: 'relative',
        }}
      >
        {/* Inner gold frame, like the labels */}
        <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 24, border: '2px solid rgba(247,215,122,0.6)', borderRadius: 28 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 16,
              background: '#8f0f16',
              border: '3px solid #f7d77a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffe500',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            KH
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#ffe500' }}>Khang Hưng Tửu</div>
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: 3 }}>LONG AN · SINCE 1991</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1000 }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#f7d77a', letterSpacing: 2, textTransform: 'uppercase' }}>{kicker}</div>
          <div style={{ display: 'flex', fontSize: title.length > 60 ? 54 : 64, fontWeight: 700, lineHeight: 1.12, marginTop: 14, letterSpacing: -1 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>
          <div style={{ display: 'flex' }}>{host}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                width: 44,
                height: 44,
                borderRadius: 9999,
                border: '3px solid #ffe500',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#ffe500',
              }}
            >
              18+
            </div>
            {footer}
          </div>
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
