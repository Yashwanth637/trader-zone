import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/delta-api': {
        target: 'https://api.india.delta.exchange',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/delta-api/, ''),
        headers: {
          'Origin': 'https://www.delta.exchange',
          'Referer': 'https://www.delta.exchange/'
        }
      }
    }
  }
});
