 // ultimate-fighter/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 📢 THE FIX: Use the absolute root path for asset loading
  base: '/', 

  root: './',
  build: {
    rollupOptions: {
      input: './public/index.html', 
    },
  },
});
