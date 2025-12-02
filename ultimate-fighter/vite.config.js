 // ultimate-fighter/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 📢 THE FIX: Set the base public path for the build
  base: './', // Use relative path for all assets (this is the most robust fix)

  root: './',
  build: {
    rollupOptions: {
      input: './public/index.html', 
    },
  },
});
