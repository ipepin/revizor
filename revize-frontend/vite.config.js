// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // port, na kterém běží dev-server
    port: 5173,
    proxy: {
      // katalog komponent
      '/catalog': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/catalog/, '/catalog'),
      },
      // seznam závad
      '/defects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // revize (GET, PATCH, POST)
      '/revisions': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // projekty
      '/projects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // případné další endpointy pod /api
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
