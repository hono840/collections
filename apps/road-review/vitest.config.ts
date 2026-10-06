import { defineConfig } from 'vitest/config'

// Unit + component tests (jsdom). DB/RLS tests live in vitest.rls.config.ts
// because they need a running local Supabase.
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
      'tests/rls/**',
      'tests/e2e/**',
    ],
  },
})
