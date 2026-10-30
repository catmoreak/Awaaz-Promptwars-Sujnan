import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // In development the API runs separately. In production it serves this site itself.
  server: { port: 5173, strictPort: true, proxy: { '/v1': 'http://localhost:4000' } },
});
