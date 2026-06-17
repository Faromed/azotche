import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // ── Proxy dev : résout CORS FedaPay en développement local ────────────────
  server: {
    proxy: {
      // FedaPay Live API  →  utilisé quand VITE_FEDAPAY_SANDBOX != 'true'
      '/fedapay-proxy': {
        target:       'https://api.fedapay.com',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/fedapay-proxy/, ''),
        secure:       true,
      },
      // FedaPay Sandbox  →  utilisé quand VITE_FEDAPAY_SANDBOX === 'true'
      '/fedapay-sandbox': {
        target:       'https://sandbox-api.fedapay.com',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/fedapay-sandbox/, ''),
        secure:       true,
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.svg'],
      manifest: {
        name: 'AZOTCHE - Artisans du Benin',
        short_name: 'AZOTCHE',
        description: 'Trouvez les meilleurs artisans au Benin',
        theme_color: '#FF6B35',
        background_color: '#FAFAFA',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/artisans',
        lang: 'fr',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
