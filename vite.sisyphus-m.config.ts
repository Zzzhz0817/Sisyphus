import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sisyphus-m/',
  define: {
    __MOBILE__: true,
  },
  build: {
    outDir: 'dist-sisyphus-m',
  },
});
