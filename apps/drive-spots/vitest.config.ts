import { defineConfig } from 'vitest/config'

// Unit + component tests (jsdom). Build/CI scripts (scripts/**/*.mjs) keep their tests next to them
// and opt into the node environment with `// @vitest-environment node`.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
})
