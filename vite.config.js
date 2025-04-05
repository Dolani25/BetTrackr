import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure proper resolution of react-router-dom
      'react-router-dom': require.resolve('react-router-dom'),
    },
  },
});