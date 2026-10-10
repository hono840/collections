import { defineConfig } from 'vitest/config'

// Unit + component tests (jsdom). E2E lives in tests/e2e (Playwright).
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    include: [
      'src/**/*.test.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
    ],
  },
})
