import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
// Tauri expects a fixed port, fail if that port is not available.
const TAURI_DEV_HOST = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: TAURI_DEV_HOST || 'localhost',
    port: 1420,
    strictPort: true,
    hmr: TAURI_DEV_HOST
      ? {
          protocol: 'ws',
          host: TAURI_DEV_HOST,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Tauri runtime targets: Edge WebView2 (Chromium ≥105) on Windows,
    // WKWebView (Safari 14+, macOS 11 Big Sur floor) on macOS, and
    // WebKitGTK on Linux. All three natively support the full ES2020
    // syntax set (destructuring, arrow functions, optional chaining,
    // nullish coalescing, BigInt).
    //
    // We target an ES-syntax level rather than a specific browser for
    // a sharp reason: esbuild's BROWSER compat tables have a recurring
    // bug where they flag certain parameter-destructuring and arrow-
    // function patterns as "needs transpilation" for safari13/14 even
    // though Safari supports those patterns natively — and then
    // esbuild also doesn't know HOW to transpile them, so the build
    // fails with "Transforming destructuring to the configured target
    // environment is not supported yet". First we saw this on safari13
    // and bumped to safari14; on 2026-04-23 safari14 started triggering
    // the same failure on ThemeContext's parameter destructuring.
    //
    // `es2020` sidesteps the browser compat table entirely — esbuild
    // just checks syntax against the ES2020 spec, which all three Tauri
    // runtimes fully implement. If Tauri ever regresses a runtime below
    // ES2020, we'll see real runtime errors, not a phantom build error.
    target: 'es2020',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
