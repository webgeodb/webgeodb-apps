import { defineConfig } from 'vite';

export default defineConfig({
  base: '/webgeodb/apps/location-tracking/',
  server: {
    port: 3002,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
