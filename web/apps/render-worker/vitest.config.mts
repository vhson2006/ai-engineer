import { defineConfig } from 'vitest/config';

// Unit tests of the render flow with fake renderer and storage (no browser, no NATS).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
