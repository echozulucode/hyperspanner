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
    // Tauri runtime targets: Edge WebView2 (Chromium) on Windows, WKWebView
    // on macOS (Safari 14+ ships with macOS 11 Big Sur, our floor), and
    // WebKitGTK on Linux. esbuild's compat table refuses to down-transpile
    // certain parameter-destructuring and arrow-function patterns for
    // `safari13` (the Tauri v1 default) even though those features work in
    // Safari 13 at runtime — so we lift the floor to safari14, matching
    // Tauri v2's recommended macOS 11 minimum.
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
