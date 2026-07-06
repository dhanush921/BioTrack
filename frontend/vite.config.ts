import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Increase limit to reduce warnings (actual splitting done via manualChunks)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cacheable chunks
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Chart library (very large)
          'vendor-recharts': ['recharts'],
          // Icon library
          'vendor-lucide': ['lucide-react'],
          // PDF/export utilities
          'vendor-pdf': ['jspdf'],
          // Excel export
          'vendor-xlsx': ['xlsx'],
          // QR code scanner
          'vendor-qr': ['html5-qrcode', 'qrcode'],
          // Firebase client
          'vendor-firebase': ['firebase'],
        }
      }
    }
  }
})
