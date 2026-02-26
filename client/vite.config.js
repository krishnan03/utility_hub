import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Resolve to the EXACT same React files for all imports
const reactPath = path.resolve(__dirname, '../node_modules/react');
const reactDomPath = path.resolve(__dirname, '../node_modules/react-dom');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force every import of 'react' and 'react-dom' to the same physical path
      // This prevents any duplicate React instances from Univer or other packages
      'react': reactPath,
      'react-dom': reactDomPath,
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'framer-motion',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'framer-motion',
      'pdfjs-dist',
      '@univerjs/presets',
      '@univerjs/preset-sheets-core',
    ],
    force: true,
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
  },
});
