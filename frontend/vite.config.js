import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY || 'http://127.0.0.1:5002', changeOrigin: true },
      '/uploads': { target: process.env.VITE_API_PROXY || 'http://127.0.0.1:5002', changeOrigin: true },
    },
  },
})
