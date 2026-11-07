import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { profile } from '@/content/profile';
import { isLocale, type Locale } from '@/i18n/locales';
import { loadMessages } from '@/i18n/dictionaries';
import { SITE_URL } from '@/site';

/**
 * Link preview image (Open Graph + Twitter card), one per language. Every page under [lang] gets
 * it unless a deeper segment defines its own. Reading `params` makes the route dynamic under Cache
 * Components, so each image is rendered once per server process (memory cache below) and served
 * with a long Cache-Control for CDNs and crawlers.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${profile.name}`;

// Geist with Vietnamese glyphs (packages/ui/assets/fonts, SIL OFL). Both `next dev`/`next build`
// and the standalone server.js run with the app folder as cwd; next.config.ts traces the fonts.
const fonts = join(process.cwd(), '../../packages/ui/assets/fonts');

const rendered = new Map<Locale, Promise<ArrayBuffer>>();

export default async function OpenGraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : 'en';
  let png = rendered.get(locale);
  if (!png) {
    png = render(locale).then((response) => response.arrayBuffer());
    png.catch(() => rendered.delete(locale)); // a failed render is retried next time
    rendered.set(locale, png);
  }
  return new Response(await png, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}

async function render(locale: Locale): Promise<ImageResponse> {
  const [t, regular, bold] = await Promise.all([
    loadMessages(locale),
    readFile(join(fonts, 'Geist-Regular.ttf')),
    readFile(join(fonts, 'Geist-Bold.ttf')),
  ]);
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0b1020 0%, #111a3a 55%, #1e1b4b 100%)',
          color: '#e5e7eb',
          fontFamily: 'Geist',
          position: 'relative',
        }}
      >
        {/* Soft brand glow */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            right: -160,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 70%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #4338ca)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 64 64">
              <path d="M18 21.5 29.5 32 18 42.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="33" y="38.5" width="15" height="6" rx="3" fill="#fff" />
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 18px',
              borderRadius: 9999,
              border: '1px solid rgba(255,255,255,0.18)',
              fontSize: 24,
              color: '#c7d2fe',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#34d399' }} />
            {t.profile.availability}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, color: '#ffffff', lineHeight: 1.05 }}>{profile.name}</div>
          <div style={{ fontSize: 46, fontWeight: 700, color: '#a5b4fc', marginTop: 10, letterSpacing: -1 }}>{t.profile.role}</div>
          <div style={{ fontSize: 28, lineHeight: 1.45, color: '#cbd5e1', marginTop: 28, maxWidth: 960 }}>{t.profile.tagline}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#94a3b8' }}>
          <div style={{ display: 'flex' }}>{host}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {t.profile.skills.slice(0, 3).map((group) => (
              <div
                key={group.group}
                style={{ display: 'flex', padding: '6px 16px', borderRadius: 9999, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
              >
                {group.group}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}
