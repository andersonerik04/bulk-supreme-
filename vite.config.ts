import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves the site from https://andersonerik04.github.io/bulk-supreme-/,
// so every asset URL in a production build must start with the repo name.
// The dev server runs at the root. Set BASE_PATH=/ to deploy at a domain root (e.g. Vercel).
const REPO_BASE = '/bulk-supreme-/';

export default defineConfig(({ command }) => {
  const base = process.env.BASE_PATH ?? (command === 'build' ? REPO_BASE : '/');
  return {
    base,
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Ledger — Health Tracker',
          short_name: 'Ledger',
          description: 'Track weight, food and water. Private, offline, on-device.',
          theme_color: '#0a0a0f',
          background_color: '#0a0a0f',
          display: 'standalone',
          orientation: 'portrait',
          id: base,
          start_url: base,
          scope: base,
          icons: [
            { src: `${base}pwa-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}pwa-512.png`, sizes: '512x512', type: 'image/png' },
            { src: `${base}pwa-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
  };
});
