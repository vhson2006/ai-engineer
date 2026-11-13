import { cancelRender, continueRender, delayRender, getRemotionEnvironment } from 'remotion';

/*
 * Be Vietnam Pro (SIL OFL 1.1, fonts/OFL.txt; files from @fontsource/be-vietnam-pro 5.3.0): every
 * Vietnamese diacritic, readable at small sizes. Self-hosted (ADR 0039): render-worker never
 * depends on Google Fonts and admin-web's CSP stays `font-src 'self'`. `new URL(…, import.meta.url)`
 * makes both bundlers (Remotion's webpack, Next's Turbopack) emit each file and give its URL.
 * Three subsets per weight, as Google Fonts serves them: the browser downloads only the ones a text
 * needs (unicode-range).
 */
export const STUDIO_FONT_FAMILY = 'Be Vietnam Pro';

const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
} as const;

type Subset = keyof typeof RANGES;

// Literal paths: bundlers only follow `new URL('<literal>', import.meta.url)`.
const FILES: { weight: string; subset: Subset; url: URL }[] = [
  { weight: '500', subset: 'latin', url: new URL('./fonts/be-vietnam-pro-latin-500-normal.woff2', import.meta.url) },
  { weight: '500', subset: 'latin-ext', url: new URL('./fonts/be-vietnam-pro-latin-ext-500-normal.woff2', import.meta.url) },
  { weight: '500', subset: 'vietnamese', url: new URL('./fonts/be-vietnam-pro-vietnamese-500-normal.woff2', import.meta.url) },
  { weight: '600', subset: 'latin', url: new URL('./fonts/be-vietnam-pro-latin-600-normal.woff2', import.meta.url) },
  { weight: '600', subset: 'latin-ext', url: new URL('./fonts/be-vietnam-pro-latin-ext-600-normal.woff2', import.meta.url) },
  { weight: '600', subset: 'vietnamese', url: new URL('./fonts/be-vietnam-pro-vietnamese-600-normal.woff2', import.meta.url) },
  { weight: '700', subset: 'latin', url: new URL('./fonts/be-vietnam-pro-latin-700-normal.woff2', import.meta.url) },
  { weight: '700', subset: 'latin-ext', url: new URL('./fonts/be-vietnam-pro-latin-ext-700-normal.woff2', import.meta.url) },
  { weight: '700', subset: 'vietnamese', url: new URL('./fonts/be-vietnam-pro-vietnamese-700-normal.woff2', import.meta.url) },
  { weight: '800', subset: 'latin', url: new URL('./fonts/be-vietnam-pro-latin-800-normal.woff2', import.meta.url) },
  { weight: '800', subset: 'latin-ext', url: new URL('./fonts/be-vietnam-pro-latin-ext-800-normal.woff2', import.meta.url) },
  { weight: '800', subset: 'vietnamese', url: new URL('./fonts/be-vietnam-pro-vietnamese-800-normal.woff2', import.meta.url) },
];

let started = false;

/**
 * Registers the faces once per page. While rendering, frames wait until every face is loaded
 * (a frame with a fallback font would be wrong forever) and a failure fails the render, which
 * render-worker retries. In the admin's preview a failure only leaves the fallback font.
 */
export function loadStudioFonts(): void {
  if (started || typeof FontFace === 'undefined' || typeof document === 'undefined') return;
  started = true;
  const rendering = getRemotionEnvironment().isRendering;
  const handle = delayRender(`Loading ${STUDIO_FONT_FAMILY}`);
  const faces = FILES.map(
    ({ weight, subset, url }) =>
      new FontFace(STUDIO_FONT_FAMILY, `url(${url.href}) format('woff2')`, { weight, style: 'normal', unicodeRange: RANGES[subset] }),
  );
  // Rendering: load every face now (the text of a later frame may need any of them).
  Promise.all(
    faces.map(async (face) => {
      document.fonts.add(face);
      if (rendering) await face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((error: unknown) => {
      if (rendering) cancelRender(error);
      else continueRender(handle);
    });
}
