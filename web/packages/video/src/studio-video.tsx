import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, Series, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadStudioFonts, STUDIO_FONT_FAMILY } from './fonts';
import type { StudioScene, StudioVideoProps } from './props';

/*
 * The studio's clips (ADR 0039), drawn for 1080×1920. One renderer, three looks (one per script
 * template): `price` (a big price caption), `host` (a host who talks: full screen or a bubble in
 * the corner), `tips` (numbered tips). Every scene: its image slowly zooming, the on-screen text,
 * the spoken line as a subtitle (most people watch muted), its voice. The brand card closes.
 */

// Be Vietnam Pro, self-hosted (./fonts.ts); a system sans-serif only if it can't load in a preview.
loadStudioFonts();
const fontFamily = `'${STUDIO_FONT_FAMILY}', sans-serif`;

export type StudioLook = 'price' | 'host' | 'tips';

const WHITE = '#ffffff';
const INK = '#111111';

export function StudioVideo({ look, ...props }: StudioVideoProps & { look: StudioLook }) {
  const { brand } = props;
  let tip = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: brand.primaryColor, fontFamily, color: WHITE }}>
      <Series>
        {props.scenes.map((scene, index) => {
          const number = look === 'tips' && /^tip\d+$/.test(scene.id) ? ++tip : null;
          return (
            <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
              <Scene scene={scene} look={look} brand={brand} first={index === 0} number={number} />
            </Series.Sequence>
          );
        })}
        {props.endCardFrames > 0 && (
          <Series.Sequence durationInFrames={props.endCardFrames}>
            <EndCard brand={brand} />
          </Series.Sequence>
        )}
      </Series>
    </AbsoluteFill>
  );
}

type Brand = StudioVideoProps['brand'];

function Scene({
  scene,
  look,
  brand,
  first,
  number,
}: {
  scene: StudioScene;
  look: StudioLook;
  brand: Brand;
  first: boolean;
  number: number | null;
}) {
  const frame = useCurrentFrame();
  const fadeIn = first ? 1 : interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const hasImage = Boolean(scene.imageUrl);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {scene.voiceUrl && <Audio src={scene.voiceUrl} />}
      {hasImage ? <KenBurns src={scene.imageUrl!} /> : <BrandBackdrop brand={brand} />}
      {scene.avatarMode === 'full' && scene.avatarUrl && <AvatarFull src={scene.avatarUrl} brand={brand} />}
      {/* Readability: dark at the top and bottom where the texts sit. */}
      {hasImage && (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,.75) 100%)',
          }}
        />
      )}
      <Caption
        text={scene.onScreen}
        brand={brand}
        big={look === 'price' && first}
        number={number}
        position={scene.avatarMode === 'full' ? 'bottom' : 'top'}
      />
      {scene.avatarMode === 'corner' && scene.avatarUrl && <AvatarCorner src={scene.avatarUrl} brand={brand} />}
      <Subtitle text={scene.voice} raised={scene.avatarMode === 'corner'} />
    </AbsoluteFill>
  );
}

/** The image fills the frame and slowly zooms in (Ken Burns). */
function KenBurns({ src }: { src: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, Math.max(durationInFrames, 1)], [1.04, 1.16]);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: INK }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
}

/** Without an image: the brand colours with two soft discs. */
function BrandBackdrop({ brand }: { brand: Brand }) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 30;
  const disc = (style: CSSProperties) => (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        opacity: 0.18,
        background: brand.accentColor,
        ...style,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: brand.primaryColor, overflow: 'hidden' }}>
      {disc({ width: 900, height: 900, top: -300 + drift, right: -350 })}
      {disc({ width: 600, height: 600, bottom: -200 - drift, left: -250 })}
    </AbsoluteFill>
  );
}

/** The on-screen text: a bold block in the accent colour that springs in. */
function Caption({
  text,
  brand,
  big,
  number,
  position,
}: {
  text: string;
  brand: Brand;
  big: boolean;
  number: number | null;
  position: 'top' | 'bottom';
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  if (!text.trim()) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        [position === 'top' ? 'top' : 'bottom']: position === 'top' ? 200 : 560,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 24,
        transform: `translateY(${(1 - enter) * (position === 'top' ? -60 : 60)}px)`,
        opacity: enter,
      }}
    >
      {number !== null && (
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 36,
            background: WHITE,
            color: brand.primaryColor,
            fontSize: 84,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {number}
        </div>
      )}
      <div
        style={{
          background: brand.accentColor,
          color: readableOn(brand.accentColor),
          padding: big ? '28px 40px' : '22px 34px',
          borderRadius: 32,
          fontSize: big ? 104 : 72,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** The spoken line, small, at the bottom (muted viewers). */
function Subtitle({ text, raised }: { text: string; raised: boolean }) {
  if (!text.trim()) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: raised ? 380 : 72,
        right: 72,
        bottom: raised ? 260 : 200,
        fontSize: 46,
        fontWeight: 500,
        lineHeight: 1.35,
        textShadow: '0 3px 14px rgba(0,0,0,.85)',
      }}
    >
      {text}
    </div>
  );
}

/** The host full screen: a large round portrait on the brand colours, bobbing while speaking. */
function AvatarFull({ src, brand }: { src: string; brand: Brand }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const bob = Math.abs(Math.sin(frame / 3.2)) * 10;
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 320,
      }}
    >
      <div
        style={{
          width: 760,
          height: 760,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `18px solid ${brand.accentColor}`,
          boxShadow: '0 40px 90px rgba(0,0,0,.35)',
          transform: `scale(${0.85 + enter * 0.15}) translateY(${-bob}px)`,
        }}
      >
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </AbsoluteFill>
  );
}

/** The host in a corner bubble over the image, bobbing while speaking. */
function AvatarCorner({ src, brand }: { src: string; brand: Brand }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 12 } });
  const bob = Math.abs(Math.sin(frame / 3.2)) * 8;
  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        bottom: 200,
        width: 280,
        height: 280,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `12px solid ${brand.accentColor}`,
        boxShadow: '0 24px 60px rgba(0,0,0,.45)',
        transform: `scale(${enter}) translateY(${-bob}px)`,
      }}
    >
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

/** The closing card: logo, name, tagline, phone, call to action, the fixed note (wine: 18+). */
function EndCard({ brand }: { brand: Brand }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15 } });
  const line = (delay: number): CSSProperties => {
    const t = spring({ frame: frame - delay, fps, config: { damping: 15 } });
    return { opacity: t, transform: `translateY(${(1 - t) * 30}px)` };
  };
  return (
    <AbsoluteFill>
      <BrandBackdrop brand={brand} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 90,
          gap: 36,
          transform: `scale(${0.94 + enter * 0.06})`,
        }}
      >
        {brand.logoUrl && (
          <Img
            src={brand.logoUrl}
            style={{
              width: 260,
              height: 260,
              objectFit: 'contain',
              borderRadius: 40,
              background: WHITE,
              padding: 24,
              ...line(0),
            }}
          />
        )}
        <Text
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
            ...line(3),
          }}
        >
          {brand.name}
        </Text>
        {brand.tagline && <Text style={{ fontSize: 46, fontWeight: 500, opacity: 0.9, ...line(6) }}>{brand.tagline}</Text>}
        {brand.phone && (
          <Text
            style={{
              marginTop: 20,
              background: brand.accentColor,
              color: readableOn(brand.accentColor),
              borderRadius: 999,
              padding: '22px 56px',
              fontSize: 72,
              fontWeight: 800,
              ...line(9),
            }}
          >
            {brand.phone}
          </Text>
        )}
        {brand.callToAction && <Text style={{ fontSize: 50, fontWeight: 700, ...line(12) }}>{brand.callToAction}</Text>}
      </AbsoluteFill>
      {brand.footerNote && (
        <Sequence from={0} layout="none">
          <div
            style={{
              position: 'absolute',
              left: 80,
              right: 80,
              bottom: 120,
              textAlign: 'center',
              fontSize: 34,
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            {brand.footerNote}
          </div>
        </Sequence>
      )}
    </AbsoluteFill>
  );
}

function Text({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ maxWidth: '100%', textWrap: 'balance', ...style }}>{children}</div>;
}

/** Black or white text, whichever reads better on `hex` (relative luminance). */
export function readableOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? INK : WHITE;
}
