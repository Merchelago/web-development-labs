import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Запросы /api/* в режиме разработки проксируются на Express-сервер (порт 3011),
// поэтому клиент обращается к API по относительному адресу и не зависит от CORS.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5311,
        strictPort: true,
        proxy: { '/api': 'http://localhost:3011' },
    },
});
