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
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/arenas': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/questions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass: (req) => {
          const pathname = req.url ? req.url.split('?')[0] : ''
          // Only serve index.html for the client-side SPA route /admin, NOT for API endpoints (/admin/export, /admin/template, /admin/stats, /admin/import)
          if ((pathname === '/admin' || pathname === '/admin/') && req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/rooms': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
