import { defineConfig } from 'vitest/config'

// DB / RLS tests. Requires a running local Supabase (`supabase start`)
// and SUPABASE_SERVICE_ROLE_KEY from `supabase status -o env` (test-only; never set on Vercel).
// Run with: pnpm test:rls
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    include: ['tests/rls/**/*.test.ts'],
    // Tests share one database; run files sequentially to avoid cross-test interference.
    fileParallelism: false,
    passWithNoTests: true,
    testTimeout: 30_000,
  },
})
