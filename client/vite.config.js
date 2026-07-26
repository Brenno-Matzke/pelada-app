import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        // The compressed profile-photo data URLs pushed through /peladas/current
        // aren't build assets, so the default 2 MiB precache cap only needs to
        // cover the app shell itself — leave it as-is.
      },
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Pelada das Abelhas',
        short_name: 'Pelada',
        description: 'App da pelada de domingo — confirmar presença, times e pagamentos.',
        lang: 'pt-BR',
        theme_color: '#1a1c22',
        background_color: '#1a1c22',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
