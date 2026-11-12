import path from 'node:path';
import type { NextConfig } from 'next';

// The web workspace root (web/): shared packages live in web/packages (ADR 0019).
const workspaceRoot = path.join(__dirname, '../..');

// The public origin, BAKED INTO THE BUILD (ADR 0021): canonical URLs, hreflang, the sitemap and
// Open Graph images need absolute URLs in prerendered HTML. Local builds fall back to APP_URL.
const siteUrl = (process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3300').replace(/\/$/, '');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Inlined at build time: the same value in prerendered pages and at runtime (src/site.ts).
  env: { SITE_URL: siteUrl },
  outputFileTracingRoot: workspaceRoot,
  // The link preview images read these fonts at runtime (src/features/articles/og-card.tsx).
  outputFileTracingIncludes: {
    '/og/[image]': ['../../packages/ui/assets/fonts/*.ttf'],
    '/og/bai-viet/[lang]/[image]': ['../../packages/ui/assets/fonts/*.ttf'],
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  allowedDevOrigins: ['wine.localtest.me'],
  turbopack: {
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
