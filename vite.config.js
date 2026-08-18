/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression' // 1. Import it here

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 2. Add it to your plugins array
    compression({ 
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
  test: {
    setupFiles: ['./tests/setup.js'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
})