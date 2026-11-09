import path from 'node:path';
import type { NextConfig } from 'next';

// The web workspace root (web/): shared packages live in web/packages (ADR 0019).
const workspaceRoot = path.join(__dirname, '../..');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
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
