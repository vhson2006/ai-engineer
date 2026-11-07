// Renders every app's icon set from its SVG sources (run after editing an icon: npm run icons).
//
//   apps/<app>/src/app/icon.svg          source; served as is (<link rel="icon" type="image/svg+xml">)
//   apps/<app>/assets/icon-maskable.svg  full-bleed variant (safe zone) for Android / iOS
// →
//   src/app/favicon.ico                  16, 32, 48 px (PNG inside ICO): old browsers, feed readers, crawlers
//   src/app/apple-icon.png               180 px, opaque (iOS home screen; iOS rounds the corners itself)
//   public/icons/icon-192.png, icon-512.png            web app manifest
//   public/icons/icon-maskable-512.png                 web app manifest, purpose "maskable"
//
// Next.js picks up src/app/{icon.svg,favicon.ico,apple-icon.png} by file convention and adds the
// <link> tags; the manifest (src/app/manifest.ts) points at public/icons/*. Uses sharp (installed
// with Next.js). The outputs are committed: building the site never needs this script.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..', 'apps');

async function png(svg, size, { opaque = false } = {}) {
  // Rasterize at the target size (density scales the 64-unit viewBox), so small sizes stay crisp.
  let image = sharp(svg, { density: Math.max(72, (72 * size) / 64) }).resize(size, size);
  if (opaque) image = image.flatten({ background: '#ffffff' });
  return image.png({ compressionLevel: 9 }).toBuffer();
}

/** ICO container holding PNG images (supported by every browser since IE Vista era). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

for (const app of readdirSync(root)) {
  const dir = join(root, app);
  const iconSvg = join(dir, 'src', 'app', 'icon.svg');
  const maskableSvg = join(dir, 'assets', 'icon-maskable.svg');
  if (!existsSync(iconSvg) || !existsSync(maskableSvg)) continue;

  const icon = readFileSync(iconSvg);
  const maskable = readFileSync(maskableSvg);
  const out = join(dir, 'public', 'icons');
  mkdirSync(out, { recursive: true });

  const favicon = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(icon, size) })));
  writeFileSync(join(dir, 'src', 'app', 'favicon.ico'), ico(favicon));
  writeFileSync(join(dir, 'src', 'app', 'apple-icon.png'), await png(maskable, 180, { opaque: true }));
  writeFileSync(join(out, 'icon-192.png'), await png(icon, 192));
  writeFileSync(join(out, 'icon-512.png'), await png(icon, 512));
  writeFileSync(join(out, 'icon-maskable-512.png'), await png(maskable, 512, { opaque: true }));
  console.log(`${app}: favicon.ico (16/32/48), apple-icon.png (180), icons/icon-{192,512,maskable-512}.png`);
}
