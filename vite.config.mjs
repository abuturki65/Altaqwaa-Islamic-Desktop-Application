import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: 'renderer',
    base: './',
    plugins: [react()],
    build: {
        outDir: '../dist/renderer',
        emptyOutDir: true,
        target: 'chrome130',
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
