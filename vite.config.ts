import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // For GitHub Pages project sites set repository variable VITE_BASE_PATH=/REPO-NAME/
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      // Backend proxy to protect BrsApi credentials.
      // Frontend calls /api/brsapi/* -> proxied to https://Api.BrsApi.ir
      // without exposing ?key= in client bundles during dev.
      '/api/brsapi': {
        target: 'https://Api.BrsApi.ir',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/brsapi/, ''),
      },
    },
  },
})
