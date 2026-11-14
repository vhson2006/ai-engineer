
/**
 * The link preview card (1200×630, drawn by the kit: @web/site-kit/og) in the brand's colours:
 * lucky red, imperial yellow, the "興" seal, a title and a kicker (the hero line, or an article's
 * topic), the 18+ notice at the bottom. The site's card and the articles' (src/site.ts).
 */
/** `host`: the site's domain, printed at the bottom left. */
export function wineCard({ kicker, title, footer, host }: { kicker: string; title: string; footer: string; host: string }) {
  return (
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
  );
}
