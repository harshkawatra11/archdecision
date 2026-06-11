import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local dev the API runs as a small Express server on :3001 (see server/dev.ts).
// In production on Vercel, the files in /api deploy as serverless functions and this
// proxy is irrelevant.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion', 'gsap'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
});
