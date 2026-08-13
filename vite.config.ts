import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ---------------------------------------------------------------------------
// IMPORTANTE — Nome del repository GitHub
// ---------------------------------------------------------------------------
// L'app viene pubblicata su GitHub Pages all'indirizzo
//   https://<tuo-utente>.github.io/<nome-repo>/
// Perche' i file vengano trovati, la costante qui sotto deve contenere
// ESATTAMENTE il nome del tuo repository (con le barre iniziale e finale).
//
// Esempio: repository "benessere"  ->  const REPO_NAME = '/benessere/'
//
// Se un giorno pubblichi su un dominio tuo (o su <utente>.github.io) usa '/'.
// ---------------------------------------------------------------------------
const REPO_NAME = '/orgtest/'

export default defineConfig({
  base: REPO_NAME,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // qualche chunk (recharts) supera i 500 kB: alziamo la soglia dell'avviso
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Benessere',
        short_name: 'Benessere',
        description: 'Peso, ricette, task e diario: la tua app personale di benessere e organizzazione.',
        lang: 'it',
        dir: 'ltr',
        start_url: REPO_NAME,
        scope: REPO_NAME,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${REPO_NAME}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Foto delle ricette servite da Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'benessere-immagini',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
