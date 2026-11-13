import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: { '/socket.io': {target:process.env.VITE_API_PROXY || 'http://127.0.0.1:5002',ws:true}, '/uploads': { target: process.env.VITE_API_PROXY || 'http://127.0.0.1:5002', changeOrigin: true }, '/api': { target: process.env.VITE_API_PROXY || 'http://127.0.0.1:5002', changeOrigin: true } },
  },
})
