import { test, expect } from '@playwright/test'

/**
 * Marketing pages smoke (PRD 11). Confirms the static Server-Component pages render their
 * load-bearing content: the fixed hero H1, the pricing default (annual ¥9,800 + 準備中 CTA when no
 * Stripe env links are set), the 特商法 legal placeholder, and the FAQ accordion toggle.
 */
test.describe('マーケティングページ', () => {
  test('/ はヒーローH1に固定コピーを表示する', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。',
      }),
    ).toBeVisible()
  })

  test('/pricing は既定で年額¥9,800を表示し、決済CTAは準備中', async ({ page }) => {
    await page.goto('/pricing')

    // 既定選択サイクルは年額（主 CTA）。
    await expect(page.getByRole('radio', { name: '年額' })).toBeChecked()

    // 価格カード（唯一の aria-live 領域）に ¥9,800 が表示される。
    await expect(page.locator('[aria-live="polite"]')).toHaveText(/9,800/)

    // Stripe リンク未設定のため CTA は「準備中」。
    await expect(page.getByRole('link', { name: '準備中' })).toBeVisible()
  })

  test('/legal/tokushoho に【要記入】プレースホルダが含まれる', async ({ page }) => {
    await page.goto('/legal/tokushoho')
    await expect(page.getByText('【要記入】').first()).toBeVisible()
  })

  test('/faq のアコーディオン最初の項目がクリックで開く', async ({ page }) => {
    await page.goto('/faq')

    const first = page.locator('details').first()
    await expect(first).toHaveJSProperty('open', false)

    await first.locator('summary').click()
    await expect(first).toHaveJSProperty('open', true)
  })
})
