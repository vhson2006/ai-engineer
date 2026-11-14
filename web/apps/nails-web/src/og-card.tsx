import { publicDataUrl } from '@web/site-kit/og';
import { salon } from '@/content/salon';

/**
 * The link preview card (1200×630, rendered by the kit: @web/site-kit/og) in the site's bento
 * look: porcelain white, the "ENVY" wordmark, the hero headline and four pastel tiles holding
 * gallery looks (the website's gallery images: shown as looks, never "our work"). The files are
 * traced into the standalone output (next.config.ts).
 */
const INK = '#263238';
const TILES = [
  { file: 'gallery/envy-8.png', type: 'image/png', fill: '#f3e5f5' },
  { file: 'gallery/envy-3.png', type: 'image/png', fill: '#fce4ec' },
  { file: 'gallery/envy-2.png', type: 'image/png', fill: '#e0f2f1' },
  { file: 'gallery/envy-10.jpg', type: 'image/jpeg', fill: '#e3f2fd' },
];

export async function nailsCard({ kicker, title, accent, footer }: { kicker: string; title: string; accent: string; footer: string }) {
  const [logo, ...photos] = await Promise.all([publicDataUrl('images/logo-envy.png', 'image/png'), ...TILES.map((tile) => publicDataUrl(`images/${tile.file}`, tile.type))]);
  return (
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
  );
}
