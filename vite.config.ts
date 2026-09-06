/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://<user>.github.io/datapeek/ on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/datapeek/' : '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
