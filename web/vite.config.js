import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/', // served from safecatchla.com
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt', // main.js shows a "New version available" banner with a Reload button
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SafeCatchLA',
        short_name: 'SafeCatchLA',
        description: 'Mercury levels in fish at Louisiana sampling sites, with trends over time.',
        theme_color: '#2c7bb6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Data changes weekly: try the network first, fall back to the last copy when offline.
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/data/'),
          handler: 'NetworkFirst',
          options: { cacheName: 'data', networkTimeoutSeconds: 4, expiration: { maxEntries: 200 } },
        }],
        // Map tiles are deliberately not cached, per the OpenStreetMap tile usage policy.
      },
    }),
  ],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: { environment: 'jsdom', include: ['tests/**/*.test.js'], setupFiles: ['tests/setup.js'] },
})
