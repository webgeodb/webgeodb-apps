import { defineConfig } from 'vite';

export default defineConfig({
  base: '/webgeodb/apps/offline-map/',
  server: {
    port: 3001,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  worker: {
    format: 'es'
  }
});
