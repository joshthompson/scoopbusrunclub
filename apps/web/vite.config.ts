import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path'
import devtools from 'solid-devtools/vite';

export default defineConfig({
  base: '/scoopbusrunclub/',
  plugins: [devtools(), solidPlugin()],
  server: {
    port: 3005,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@style': path.resolve(__dirname, 'styled-system'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
});
