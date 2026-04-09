import { defineConfig } from 'vite';

export default defineConfig({
  base: '/si-m/',
  define: {
    __MOBILE__: true,
  },
  build: {
    outDir: 'dist-mobile',
  },
});
