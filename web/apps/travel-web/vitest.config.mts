import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests of this app (Server Actions...); the shared code is tested in packages/core (no DOM). Async Server Components are tested
// end to end, not here (see node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md).
export default defineConfig({
  resolve: {
    tsconfigPaths: true, // the @/ alias
    alias: { 'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
