import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sisyphus/',
  define: {
    __MOBILE__: false,
  },
  build: {
    outDir: 'dist-sisyphus',
  },
});
