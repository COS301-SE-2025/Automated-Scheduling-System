/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setupTests.ts',
    testTimeout: 30000, 
    hookTimeout: 30000,
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
})
