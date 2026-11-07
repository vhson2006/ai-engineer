import path from 'node:path';
import type { NextConfig } from 'next';

// The web workspace root (web/): shared packages live in web/packages (ADR 0019).
const workspaceRoot = path.join(__dirname, '../..');

// The public origin, BAKED INTO THE BUILD (ADR 0021): canonical URLs, hreflang, the sitemap and
// Open Graph images need absolute URLs in prerendered HTML. Docker: --build-arg SITE_URL=...
// (the Dockerfile refuses an empty one). Local builds fall back to APP_URL (.env.local).
const siteUrl = (process.env.SITE_URL || process.env.APP_URL || 'http://www.localtest.me:8000').replace(/\/$/, '');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Production image: .next/standalone holds server.js + only the node_modules files it needs
  // (see Dockerfile). `npm run dev` / `next start` are unaffected.
  output: 'standalone',
  // Inlined at build time: the same value in prerendered pages and at runtime (src/site.ts).
  env: { SITE_URL: siteUrl },
  // Trace from the workspace root so the standalone output includes web/packages/*.
  outputFileTracingRoot: workspaceRoot,
  // The link preview images read these fonts at runtime (src/app/[lang]/opengraph-image.tsx).
  outputFileTracingIncludes: {
    '/[lang]/opengraph-image': ['../../packages/ui/assets/fonts/*.ttf'],
    '/[lang]/twitter-image': ['../../packages/ui/assets/fonts/*.ttf'],
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // In dev the site is served through the edge Gateway (http://www.localtest.me:8000), not
  // localhost:3000; Next blocks dev assets/HMR for other origins unless they are listed here.
  allowedDevOrigins: ['www.localtest.me'],
  turbopack: {
    // Only web/ (not the whole repo: nest-microservice/node_modules would be watched too).
    root: workspaceRoot,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
