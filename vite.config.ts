import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['synclink', 'pyodide'],
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
