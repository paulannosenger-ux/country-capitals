import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// base './' makes the built app work from any folder or URL
// (local preview, GitHub Pages sub-path, ...).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // PWA: installable on the phone + works offline after the first load.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'flags/*.svg'],
      manifest: {
        name: 'Countries & Capitals',
        short_name: 'Capitals',
        description: 'Learn all countries of the world and their capitals with spaced repetition.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0e1117',
        theme_color: '#3b6cf6',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // the map data chunk is large
        // the 3D globe (three.js, ~530 KB zipped) is not preloaded for everybody
        globIgnores: ['**/GlobeMap-*.js'],
        // the satellite photos (~1 MB each) and the globe code are only downloaded by people who switch them on,
        // then kept for offline use
        runtimeCaching: [
          { urlPattern: /(satellite|earth)\.jpg$|GlobeMap-[\w-]+\.js$/, handler: 'CacheFirst', options: { cacheName: 'map-extras' } },
          // sharp satellite tiles (Esri) seen before also work offline; the oldest are dropped after 800
          { urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*World_Imagery/, handler: 'CacheFirst',
            options: { cacheName: 'sat-tiles', expiration: { maxEntries: 800 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
})
