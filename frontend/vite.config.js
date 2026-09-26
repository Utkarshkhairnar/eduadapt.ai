import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/assessment': 'http://localhost:8000',
      '/gaps': 'http://localhost:8000',
      '/learning-path': 'http://localhost:8000',
      '/quiz': 'http://localhost:8000',
      '/profile': 'http://localhost:8000',
      '/teacher': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/concepts': 'http://localhost:8000',
      '/demo': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
});
