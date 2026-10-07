import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: { open: '/dev.html' },
  preview: { open: '/dev.html' },
  build: {
    target: 'es2022',
    rollupOptions: { input: 'dev.html' },
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
