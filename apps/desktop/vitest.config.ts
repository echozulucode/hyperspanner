import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vitest config — separate from vite.config.ts so Tauri's strictPort/HMR
 * plumbing doesn't get loaded during tests.
 *
 * Tests run in `node` env by default; `jsdom` is added as needed per-file
 * via `// @vitest-environment jsdom`. Most Phase 3 tests are pure store logic
 * and don't need a DOM.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    css: false,
  },
});
