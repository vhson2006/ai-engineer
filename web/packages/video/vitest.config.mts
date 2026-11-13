import { defineConfig } from 'vitest/config';

// Unit tests of the props schema and the timing helpers (no rendering).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
