import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'framer-motion',
      'pdfjs-dist',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) return 'vendor-react';
          // Framer Motion
          if (id.includes('framer-motion')) return 'vendor-motion';
          // Recharts
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
          // PDF libs
          if (id.includes('pdf-lib') || id.includes('pdfjs-dist')) return 'vendor-pdf';
          // Spreadsheet (Univer + SheetJS)
          if (id.includes('@univerjs/') || id.includes('xlsx')) return 'vendor-spreadsheet';
          // TipTap (Word editor)
          if (id.includes('@tiptap/')) return 'vendor-tiptap';
          // KaTeX
          if (id.includes('katex')) return 'vendor-katex';
        },
      },
    },
  },
});
