/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Where the dev server proxies /api and /ws (override to run against another local backend).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Exactly one React for the app and every library (MUI, react-three, router).
    dedupe: ['react', 'react-dom', 'react-router-dom', '@emotion/react', '@emotion/styled', 'three'],
  },
  optimizeDeps: {
    // Pre-bundle lazily-imported libraries up front. Otherwise Vite discovers them mid-session,
    // re-optimizes, and the page ends up mixing two React copies ("Invalid hook call").
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'framer-motion',
      '@stomp/stompjs',
      'sockjs-client',
    ],
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    // Never silently fall through to 5174+ when 5173 is taken. The backend's
    // dev CORS allow-list names exact origins, so a drifted port makes every
    // /api call fail with an opaque 403 "Invalid CORS request". Failing loudly
    // here beats debugging that from the browser console.
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // three.js + react-three is ~750 kB raw. It only ever loads behind the
    // dynamic import in components/HoloLot.tsx, and again for the staff survey
    // viewer. Nothing on the first paint touches it.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
          // three, the renderer and drei all ship together and stay out of the
          // main bundle: HoloLot imports ./three/HoloLotScene dynamically.
          three: [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
            'postprocessing',
          ],
          motion: ['framer-motion'],
          realtime: ['@stomp/stompjs', 'sockjs-client'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
