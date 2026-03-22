import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/newcalendarapp-main/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/utils/supabase': path.resolve(__dirname, './supabase'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
        },
      },
    },
  },
})
