import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8787',
      '/entrypoints': 'http://localhost:8787',
      '/.well-known': 'http://localhost:8787',
    },
  },
});
