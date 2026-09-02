import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/auth': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/arenas': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/rooms': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/questions': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {})
          proxy.on('proxyReqWs', (proxyReq) => {
            proxyReq.setHeader('host', '127.0.0.1:3000')
          })
        },
      },
    },
  },
})
