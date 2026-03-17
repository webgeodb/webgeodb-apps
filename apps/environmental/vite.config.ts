import { defineConfig } from 'vite';

export default defineConfig({
  base: '/webgeodb/apps/environmental/',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'demo.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
