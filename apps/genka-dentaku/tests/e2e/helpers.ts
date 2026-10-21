import { expect, type Page } from '@playwright/test'

/**
 * Shared E2E helpers. Not a spec file (no *.spec/*.test suffix) so Playwright will not run it
 * directly. Selectors use the exact Japanese role/label strings rendered by the app components.
 */

/**
 * Valid annual DEV license key (docs/product/dev-license-key.md). Signed with the embedded
 * DEV_PUBLIC_KEY; payload exp = 2027-07-17, so verifyLicenseKey returns `active` (Pro) at the
 * current test date. Used to exercise the Free -> Pro unlock flow.
 */
export const DEV_LICENSE_KEY =
  'GENKA-eyJwbGFuIjoiYW5udWFsIiwiaXNzIjoiZ2Vua2EtZGVudGFrdSIsImlhdCI6MTc4MzU3NDg2NywiZXhwIjoxODE1ODAyMDY3LCJyZWYiOiJkZXYtbG9jYWwifQ-2I7QYFEKfu0ki_Ct0_jI2oQkeimPoPte_zlxT-XEhFVkdyd9eV3Xlm9p0DmsvJ3zXAYyCAbsu1d-UFY0IUh6DQ'

/** The dashboard row button for a menu (its accessible name contains the menu name). */
export function menuRow(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(name) })
}

/**
 * First-run onboarding: open /app, seed the 唐揚げ定食 sample via 「サンプルで試す」, then dismiss the
 * magic-moment tip via 「はじめる」. Leaves the app on the dashboard with the sample menu visible.
 */
export async function seedSampleViaOnboarding(page: Page): Promise<void> {
  await page.goto('/app')
  await page.getByRole('button', { name: 'サンプルで試す' }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  await expect(menuRow(page, '唐揚げ定食')).toBeVisible()
}

/**
 * Create one menu through the dashboard FAB. Clicking 「新規メニュー」 creates the menu and opens the
 * recipe editor; we return to the dashboard via the header back button so the next add can run.
 * Only valid while under the Free limit (the caller asserts the blocked case separately).
 */
export async function addMenuViaFab(page: Page): Promise<void> {
  await page.getByRole('button', { name: '新規メニュー' }).click()
  // The editor is now open — a 戻る (back) affordance appears in the header.
  await page.getByRole('button', { name: '戻る' }).click()
  await expect(page.getByRole('button', { name: '新規メニュー' })).toBeVisible()
}
