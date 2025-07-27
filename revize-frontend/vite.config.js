import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  port:5173,
  server: {
    proxy: {
      '/catalog': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/catalog/, '/catalog'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },

       "/defects": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

