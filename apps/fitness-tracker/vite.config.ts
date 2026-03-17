import { defineConfig } from 'vite';

export default defineConfig({
  base: '/webgeodb/apps/fitness-tracker/',
  server: {
    port: 3003,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
