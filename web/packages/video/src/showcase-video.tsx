import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, Series, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadStudioFonts, STUDIO_FONT_FAMILY } from './fonts';
import type { StudioScene, StudioVideoProps } from './props';

/*
 * brand-showcase (ADR 0039): the bento brand film of video/nails-promo, for any site. Porcelain
 * white, the brand's colours turned into pastel card fills, cards that pop in one after the other.
 * Scenes (layout): cover (the opening image as a tilted card), grid (looks), cards (promises),
 * prices, visit (address, hours, call to action, phone). Lists come as the admin wrote them; the
 * AI only wrote the headlines (`onScreen`) and, when narrated, the voice (shown as a subtitle).
 */

loadStudioFonts();
const fontFamily = `'${STUDIO_FONT_FAMILY}', sans-serif`;

type Brand = StudioVideoProps['brand'];
type Item = NonNullable<StudioScene['items']>[number];

const WHITE = '#ffffff';
const SURFACE = '#f4f6f7';
const INK = '#263238';
const MUTED = '#546e7a';

/** `hex` mixed with white (`amount` of white, 0–1): the pastel fills. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** `hex` darkened (`amount` of black, 0–1): accents readable on white. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function palette(brand: Brand) {
  return {
    tints: [tint(brand.primaryColor, 0.86), tint(brand.accentColor, 0.84), tint(brand.primaryColor, 0.93), tint(brand.accentColor, 0.92)],
    strong: shade(brand.primaryColor, 0.15),
  };
}
type Palette = ReturnType<typeof palette>;

export function ShowcaseVideo(props: StudioVideoProps) {
  const colors = palette(props.brand);
  return (
    <AbsoluteFill style={{ backgroundColor: WHITE, fontFamily, color: INK }}>
      <Series>
        {props.scenes.map((scene, index) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
            <Fade out={index < props.scenes.length - 1}>
              <ShowcaseScene scene={scene} brand={props.brand} colors={colors} />
            </Fade>
            {scene.voiceUrl && <Audio src={scene.voiceUrl} />}
            <Subtitle text={scene.voice} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}

function ShowcaseScene({ scene, brand, colors }: { scene: StudioScene; brand: Brand; colors: Palette }) {
  switch (scene.layout) {
    case 'cover':
      return <CoverScene scene={scene} brand={brand} colors={colors} />;
    case 'grid':
      return <GridScene scene={scene} brand={brand} colors={colors} />;
    case 'cards':
      return <CardsScene scene={scene} colors={colors} />;
    case 'prices':
      return <PricesScene scene={scene} colors={colors} />;
    case 'visit':
      return <VisitScene scene={scene} brand={brand} colors={colors} />;
    default:
      // A plain scene: its image as a card, the headline above.
      return <CoverScene scene={scene} brand={brand} colors={colors} />;
  }
}

/* ---------- building blocks ---------- */

function Fade({ children, out = true }: { children: ReactNode; out?: boolean }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = out ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' }) : 1;
  return <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>{children}</AbsoluteFill>;
}

/** Pops in (scale + fade) from `delay` frames: the bento cards. */
function Pop({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div style={{ opacity: Math.min(1, p * 1.5), transform: `scale(${0.85 + 0.15 * p}) translateY(${(1 - p) * 40}px)`, ...style }}>
      {children}
    </div>
  );
}

/** Narrated videos only: the line in a dark pill at the bottom (readable on the light cards). */
function Subtitle({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: '0 60px 90px' }}>
      <p
        style={{
          margin: 0,
          padding: '18px 30px',
          borderRadius: 28,
          background: 'rgba(38,50,56,.86)',
          color: WHITE,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.35,
          textAlign: 'center',
        }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
}

const title: CSSProperties = { fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, margin: 0, textWrap: 'balance' };
const eyebrow = (color: string): CSSProperties => ({
  fontWeight: 700,
  fontSize: 32,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color,
  margin: 0,
});
const bento: CSSProperties = { borderRadius: 48, padding: 40 };

/* ---------- scenes ---------- */

/** The opening image as a card that lifts off; the website above, the headline below. */
function CoverScene({ scene, brand, colors }: { scene: StudioScene; brand: Brand; colors: Palette }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const drift = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.inOut(Easing.quad) });
  return (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${colors.tints[0]}, ${colors.tints[2]} 55%, ${colors.tints[1]})` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 56, padding: 50 }}>
        <Pop>
          <p style={{ ...eyebrow(INK), textAlign: 'center' }}>{scene.website || brand.name}</p>
        </Pop>
        {scene.imageUrl && (
          <div
            style={{
              width: '100%',
              borderRadius: 36,
              overflow: 'hidden',
              boxShadow: '0 40px 90px rgba(38,50,56,.25)',
              transform: `perspective(1600px) rotateX(${(1 - enter) * 25 + drift * -4}deg) scale(${0.8 + 0.2 * enter + drift * 0.05})`,
              opacity: enter,
            }}
          >
            <Img src={scene.imageUrl} style={{ width: '100%', maxHeight: 1080, objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        {scene.onScreen && (
          <Pop delay={18}>
            <p style={{ ...title, fontSize: 76, textAlign: 'center' }}>{scene.onScreen}</p>
          </Pop>
        )}
      </AbsoluteFill>
    </>
  );
}

/** Up to six looks pop into a two-column bento grid, each on a pastel card with its name. */
function GridScene({ scene, brand, colors }: { scene: StudioScene; brand: Brand; colors: Palette }) {
  const gallery = scene.gallery ?? [];
  // Fewer looks: taller tiles, so the grid still fills the frame.
  const ratio = gallery.length <= 2 ? '1 / 1.25' : gallery.length <= 4 ? '1 / 1' : '1 / 0.82';
  return (
    <AbsoluteFill style={{ padding: '120px 50px', gap: 40, justifyContent: gallery.length <= 4 ? 'center' : 'flex-start' }}>
      <Pop>
        <p style={eyebrow(colors.strong)}>{brand.name}</p>
        <p style={{ ...title, fontSize: 84, marginTop: 14 }}>{scene.onScreen}</p>
      </Pop>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }}>
        {gallery.map((look, i) => (
          <Pop key={look.url} delay={14 + i * 7}>
            <div style={{ background: colors.tints[i % 4], borderRadius: 40, padding: 16 }}>
              <Img src={look.url} style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: 28, display: 'block' }} />
              {look.label && <p style={{ margin: '14px 8px 4px', fontSize: 32, fontWeight: 700 }}>{look.label}</p>}
            </div>
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** The promises: one pastel card each, title and short text. */
function CardsScene({ scene, colors }: { scene: StudioScene; colors: Palette }) {
  const items = scene.items ?? [];
  return (
    <AbsoluteFill style={{ background: SURFACE, justifyContent: 'center', padding: 50, gap: 26 }}>
      <Pop>
        <p style={{ ...title, fontSize: 80, marginBottom: 20 }}>{scene.onScreen}</p>
      </Pop>
      {items.map((item, i) => (
        <Pop key={`${item.title}-${i}`} delay={10 + i * 8}>
          <div style={{ ...bento, background: colors.tints[(i + 2) % 4] }}>
            <p style={{ margin: 0, fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>{item.title}</p>
            {item.text && <p style={{ margin: '10px 0 0', fontSize: 32, fontWeight: 500, color: MUTED, lineHeight: 1.35 }}>{item.text}</p>}
          </div>
        </Pop>
      ))}
    </AbsoluteFill>
  );
}

/** A few lines of the price list, the highlighted one last on a dark card. */
function PricesScene({ scene, colors }: { scene: StudioScene; colors: Palette }) {
  const rows = (scene.items ?? []).filter((item) => !item.highlight);
  const signature = (scene.items ?? []).find((item) => item.highlight);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: 50, gap: 22 }}>
      <Pop>
        <p style={{ ...title, fontSize: 88, marginBottom: 24 }}>{scene.onScreen}</p>
      </Pop>
      {rows.map((row, i) => (
        <Pop key={`${row.title}-${i}`} delay={10 + i * 7}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              ...bento,
              padding: '34px 40px',
              background: SURFACE,
            }}
          >
            <span style={{ fontSize: 40, fontWeight: 700 }}>{row.title}</span>
            <span style={{ fontSize: 50, fontWeight: 800, whiteSpace: 'nowrap' }}>{row.text}</span>
          </div>
        </Pop>
      ))}
      {signature && (
        <Pop delay={10 + rows.length * 7 + 4}>
          <div style={{ ...bento, background: INK, color: WHITE, marginTop: 10 }}>
            {scene.labels?.signature && <p style={eyebrow(colors.tints[0])}>{scene.labels.signature}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginTop: 10 }}>
              <span style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>{signature.title}</span>
              <span style={{ fontSize: 64, fontWeight: 800, whiteSpace: 'nowrap' }}>{signature.text}</span>
            </div>
          </div>
        </Pop>
      )}
    </AbsoluteFill>
  );
}

/** Where, when, how to book; the last frame holds. */
function VisitScene({ scene, brand, colors }: { scene: StudioScene; brand: Brand; colors: Palette }) {
  const items = scene.items ?? [];
  const address = items.filter((item) => item.group === 'address');
  const hours = items.filter((item) => item.group === 'hours');
  const labels = scene.labels ?? {};
  const cta = brand.callToAction || scene.website;
  // Each card pops 8 frames after the one before it.
  const step = (index: number) => 6 + 8 * index;
  const hoursAt = address.length > 0 ? 2 : 1;
  const ctaAt = hoursAt + (hours.length > 0 ? 1 : 0);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.tints[2]}, ${colors.tints[0]})`,
        justifyContent: 'center',
        padding: 50,
        gap: 24,
      }}
    >
      {brand.logoUrl ? (
        <Pop>
          <Img src={brand.logoUrl} style={{ maxWidth: 420, maxHeight: 200, objectFit: 'contain' }} />
        </Pop>
      ) : (
        <Pop>
          <p style={eyebrow(colors.strong)}>{brand.name}</p>
        </Pop>
      )}
      <Pop delay={step(0)}>
        <p style={{ ...title, fontSize: 84 }}>{scene.onScreen}</p>
      </Pop>
      {address.length > 0 && (
        <Pop delay={step(1)}>
          <div style={{ ...bento, background: WHITE }}>
            {labels.address && <p style={{ ...eyebrow(colors.strong), fontSize: 26 }}>{labels.address}</p>}
            {address.map((line: Item, i) => (
              <p key={i} style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 700 }}>
                {line.text}
              </p>
            ))}
          </div>
        </Pop>
      )}
      {hours.length > 0 && (
        <Pop delay={step(hoursAt)}>
          <div style={{ ...bento, background: WHITE }}>
            {labels.hours && <p style={{ ...eyebrow(colors.strong), fontSize: 26 }}>{labels.hours}</p>}
            {hours.map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 8, fontSize: 34 }}>
                <span style={{ fontWeight: 500, color: MUTED }}>{row.title}</span>
                {row.text && <span style={{ fontWeight: 700 }}>{row.text}</span>}
              </div>
            ))}
          </div>
        </Pop>
      )}
      {(cta || brand.phone) && (
        <Pop delay={step(ctaAt)}>
          <div style={{ display: 'flex', gap: 20 }}>
            {cta && (
              <div style={{ ...bento, flex: 1, background: INK, color: WHITE, textAlign: 'center', padding: '30px 20px' }}>
                <p style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.15 }}>{cta}</p>
                {brand.callToAction && scene.website && (
                  <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 500, opacity: 0.8 }}>{scene.website}</p>
                )}
              </div>
            )}
            {brand.phone && (
              <div style={{ ...bento, flex: 1, background: WHITE, textAlign: 'center', padding: '30px 20px' }}>
                <p style={{ margin: 0, fontSize: 40, fontWeight: 800 }}>{brand.phone}</p>
                {labels.phone && <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 500, color: MUTED }}>{labels.phone}</p>}
              </div>
            )}
          </div>
        </Pop>
      )}
    </AbsoluteFill>
  );
}
