import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  build: { chunkSizeWarningLimit: 900 },
  plugins: [
    laravel({ input: ['resources/js/app.tsx'], refresh: true }),
    react(),
    tailwindcss(),
  ],
});
