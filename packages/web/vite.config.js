import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(__dirname, '../shared');

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@env/shared': sharedDir,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'reactflow'],
    exclude: ['@env/shared'],
  },
});
