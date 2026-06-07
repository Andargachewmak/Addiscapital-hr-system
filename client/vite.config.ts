import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Build the static site to a top-level `dist/` at the project root so Vercel finds it
  // regardless of framework auto-detection.
  build: {
    outDir: path.resolve(__dirname, '..', 'dist'),
    emptyOutDir: true,
  },
  // Local dev: forward /api to the Express server (npm run server).
  // In production on Vercel the client and API share an origin, so no proxy is needed.
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
