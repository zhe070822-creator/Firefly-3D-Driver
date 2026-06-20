import { defineConfig } from 'vite';
import fs from 'node:fs';
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsDir: '.', rollupOptions: { input: 'index.html' } },
  plugins: [{ name: 'copy-firefly', closeBundle() { fs.cpSync('Firefly', 'dist/Firefly', { recursive: true }); } }]
});
