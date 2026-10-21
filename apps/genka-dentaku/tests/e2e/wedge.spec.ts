import { test, expect } from '@playwright/test'
import { seedSampleViaOnboarding, menuRow } from './helpers'

/**
 * THE WEDGE — the core acceptance (PRD 4.c). Editing one ingredient price must instantly recompute
 * every dependent menu's cost rate + semaphore, with no explicit recalc, no save, and no reload;
 * and the change must survive a page reload (localStorage persistence, PRD 4.g / 9).
 *
 * Sample math (PRD 4.b / 4.c, sample-data.ts): 唐揚げ定食 cost ¥203 / sell ex-tax ¥818.18 => 24.8% 良好.
 * After 鶏もも肉 ¥900 -> ¥1,200 (eff. unit price 1.00 -> 1.33/g) cost ¥253 => 30.9% 注意.
 *
 * Each test runs in an isolated browser context (fresh localStorage), so the specs are independent.
 */
test.describe('THE WEDGE: 食材価格変更 → 全メニュー即時再計算', () => {
  test('サンプルの唐揚げ定食が24.8%・良好で表示される', async ({ page }) => {
    await seedSampleViaOnboarding(page)

    const row = menuRow(page, '唐揚げ定食')
    await expect(row).toContainText('24.8%')
    await expect(row).toContainText('良好')
  })

  test('鶏もも肉の価格を900→1200に直すと同じメニューが30.9%・注意へ即再計算され、再読込後も保持される', async ({
    page,
  }) => {
    await seedSampleViaOnboarding(page)

    // Baseline on the dashboard: 良好 24.8%.
    await expect(menuRow(page, '唐揚げ定食')).toContainText('24.8%')

    // 食材タブへ移動し、鶏もも肉のインライン購入価格を 900 -> 1200 に更新（クイック編集・保存ボタンなし）。
    await page.getByRole('button', { name: '食材' }).click()
    const chickenPrice = page.getByLabel('鶏もも肉の購入価格')
    await expect(chickenPrice).toHaveValue('900')
    await chickenPrice.fill('1200')

    // ダッシュボードへ戻る（同一クライアント・再読込なし）と、同じメニューが 30.9%・注意へ更新済み。
    await page.getByRole('button', { name: 'ダッシュボード' }).click()
    const row = menuRow(page, '唐揚げ定食')
    await expect(row).toContainText('30.9%')
    await expect(row).toContainText('注意')
    await expect(row).not.toContainText('24.8%')

    // localStorage 永続化: 再読込しても 30.9%・注意 のまま。
    await page.reload()
    const rowAfterReload = menuRow(page, '唐揚げ定食')
    await expect(rowAfterReload).toContainText('30.9%')
    await expect(rowAfterReload).toContainText('注意')
  })
})
