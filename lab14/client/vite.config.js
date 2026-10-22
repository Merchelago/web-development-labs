import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Клиент на порту 5314; запросы к API и статике проксируются на сервер Express (порт 3014)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5314,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3014',
      '/media': 'http://localhost:3014',
      '/uploads': 'http://localhost:3014',
    },
  },
});
