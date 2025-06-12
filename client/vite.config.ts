import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    target: 'es2020'
  },
  server: {
    port: 5173,
    host: 'localhost'
  }
}); 