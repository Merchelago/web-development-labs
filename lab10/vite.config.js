import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: { port: 5310, strictPort: true },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        globals: true,
    },
});
