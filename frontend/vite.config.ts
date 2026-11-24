import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Geliştirmede API istekleri ASP.NET Core sunucusuna aktarılır; çerez aynı kökenden gelir.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Stüdyo sayfası ilk açıldığında bağımlılık taraması yüzünden sayfa yeniden yüklenmesin
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'zustand',
      'react-router',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5162',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:5162',
    },
  },
  build: {
    chunkSizeWarningLimit: 1400,
  },
})
