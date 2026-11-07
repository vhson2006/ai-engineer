import path from 'node:path';
import type { NextConfig } from 'next';

// The web workspace root (web/): shared packages live in web/packages (ADR 0019).
const workspaceRoot = path.join(__dirname, '../..');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // The admin site must never appear in search results (it is public, but not for the public).
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  // Production image: .next/standalone holds server.js + only the node_modules files it needs
  // (see Dockerfile). `npm run dev` / `next start` are unaffected.
  output: 'standalone',
  // Trace from the workspace root so the standalone output includes web/packages/*.
  outputFileTracingRoot: workspaceRoot,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // In dev the site is served through the edge Gateway (http://admin.localtest.me:8000), not
  // localhost:3100; Next blocks dev assets/HMR for other origins unless they are listed here.
  allowedDevOrigins: ['admin.localtest.me'],
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
