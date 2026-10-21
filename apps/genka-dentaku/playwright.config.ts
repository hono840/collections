import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 設定
 * - testDir: tests/e2e（ユニットテストは vitest が tests/**, src/** を担当）
 * - webServer: `pnpm dev` を port 3000 で起動し、E2E 実行前に待機
 * 参照: https://playwright.dev/docs/test-configuration
 */

/**
 * この環境では Chromium がビルド 1194 で事前インストール済み（PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers）。
 * インストール済み @playwright/test が期待するビルドと番号がずれているため、存在する実 Chromium を
 * executablePath で直接指す（`playwright install` は実行しない方針）。存在しなければ既定に委ねる。
 */
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executablePath = existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Generous per-test timeout: `next dev` compiles routes on first hit (esp. the client /app island).
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
