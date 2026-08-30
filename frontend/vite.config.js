import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 3001,
      protocol: 'ws',
    },
    proxy: {
      '/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/weather': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/search': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  cacheDir: path.resolve(__dirname, '.vite_cache'),
});
