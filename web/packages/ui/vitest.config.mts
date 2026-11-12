import { defineConfig } from 'vitest/config';

// Unit tests of the design system's helpers. A test that needs a DOM (Tiptap) opts in with
// `// @vitest-environment jsdom` at its top.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
