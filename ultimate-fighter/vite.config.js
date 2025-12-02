// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 📢 THE FIX IS HERE: Configure the entry point for your HTML
  root: './',
  build: {
    // The entry file is now correctly pointed to public/index.html
    rollupOptions: {
      input: './public/index.html', 
    },
  },
});