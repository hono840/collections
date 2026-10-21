import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { seedSampleViaOnboarding, addMenuViaFab, menuRow, DEV_LICENSE_KEY } from './helpers'

/**
 * Free / Pro gating (PRD 5 + 4.f). Verifies the gates wired into the running app:
 *   1. A Pro-only dashboard control (一括値上げシミュレーション) is locked with a PRO mark while Free.
 *   2. The Free 3-menu limit blocks a 4th create with the upgrade banner; existing data stays.
 *   3. Applying the DEV license key in 設定 flips the app to Pro (「Pro利用中」) and unlocks the gate.
 *   4. CSV/PDF export (4.f, Pro) — 設定＞データ管理 のエクスポート節: Free は押下でアップセル、Pro は
 *      メニュー一覧CSV を BOM 付き UTF-8 でダウンロードできる。
 *
 * Each test runs in an isolated browser context (fresh localStorage) → the specs are independent.
 */
test.describe('Free / Pro ゲーティング', () => {
  test('Free では Pro 専用の一括値上げシミュレーションがロック表示される', async ({ page }) => {
    await seedSampleViaOnboarding(page)

    const bulk = page.getByRole('button', { name: /一括値上げシミュレーション/ })
    await expect(bulk).toBeVisible()
    await expect(bulk).toContainText('PRO')
  })

  test('Free はメニュー3件で4件目の作成がアップグレードゲートされ、既存データは残る', async ({ page }) => {
    // サンプルで 1 件（唐揚げ定食）。FAB で 2 件追加して上限の 3 件にする。
    await seedSampleViaOnboarding(page)
    await addMenuViaFab(page)
    await addMenuViaFab(page)

    // 4 件目の作成はブロックされ、アップセルバナーが出る（新規作成されない）。
    await page.getByRole('button', { name: '新規メニュー' }).click()
    await expect(page.getByText('メニューは3件までです')).toBeVisible()

    // 既存メニュー（サンプル）は消えていない。
    await expect(menuRow(page, '唐揚げ定食')).toBeVisible()
  })

  test('設定で DEV ライセンスキーを入力すると Pro が有効になり、ロックが解除される', async ({ page }) => {
    await seedSampleViaOnboarding(page)

    // Free 前提: ダッシュボードの一括値上げは PRO ロック。
    await expect(page.getByRole('button', { name: /一括値上げシミュレーション/ })).toContainText('PRO')

    // 設定タブでライセンスキーを貼り付けて解錠。
    await page.getByRole('button', { name: '設定' }).click()
    await page.getByLabel('ライセンスキー').fill(DEV_LICENSE_KEY)
    await page.getByRole('button', { name: '解錠' }).click()

    // Ed25519 署名検証に成功 → Pro（active）表示。
    await expect(page.getByText('Pro利用中')).toBeVisible()

    // ダッシュボードへ戻ると Pro 専用機能のロックが外れている（PRO マークが消える）。
    await page.getByRole('button', { name: 'ダッシュボード' }).click()
    const bulk = page.getByRole('button', { name: /一括値上げシミュレーション/ })
    await expect(bulk).toBeVisible()
    await expect(bulk).not.toContainText('PRO')
  })

  test('Free では CSV 出力がロックされ、押下でアップグレードゲートが出る（4.f）', async ({ page }) => {
    await seedSampleViaOnboarding(page)
    await page.getByRole('button', { name: '設定' }).click()

    // エクスポート節が存在し、メニュー一覧CSV ボタンが見える（Free ではロック）。
    const csvButton = page.getByRole('button', { name: 'メニュー一覧CSV' })
    await expect(csvButton).toBeVisible()

    // 押下でインラインのアップセルコピーが出る（ダウンロードは発生しない）。
    await csvButton.click()
    await expect(page.getByText('CSV出力はProです')).toBeVisible()
  })

  test('Pro は メニュー一覧CSV を BOM 付きでダウンロードでき、唐揚げ定食を含む（4.f）', async ({ page }) => {
    await seedSampleViaOnboarding(page)

    // 設定で DEV ライセンスキーを適用して Pro 解錠。
    await page.getByRole('button', { name: '設定' }).click()
    await page.getByLabel('ライセンスキー').fill(DEV_LICENSE_KEY)
    await page.getByRole('button', { name: '解錠' }).click()
    await expect(page.getByText('Pro利用中')).toBeVisible()

    // メニュー一覧CSV をダウンロード。
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'メニュー一覧CSV' }).click()
    const download = await downloadPromise

    // ファイル名は genka-dentaku-menus-YYYYMMDD.csv。
    expect(download.suggestedFilename()).toMatch(/^genka-dentaku-menus-\d{8}\.csv$/)

    // 中身は BOM 付き UTF-8（先頭が U+FEFF）で、サンプルメニュー（唐揚げ定食）を含む。
    const path = await download.path()
    const content = await readFile(path, 'utf-8')
    expect(content.charCodeAt(0)).toBe(0xfeff)
    expect(content.startsWith('﻿')).toBe(true)
    expect(content).toContain('唐揚げ定食')
  })

  /**
   * JSON backup (PRD 4.g, Free) coexists with the CSV/PDF export above. This verifies a real download
   * event fires and the downloaded file is the whole-state backup envelope (app marker + sample menu).
   */
  test('設定からJSONバックアップをダウンロードすると download イベントが発火し、全データを含む.jsonが得られる', async ({
    page,
  }) => {
    await seedSampleViaOnboarding(page)
    await page.getByRole('button', { name: '設定' }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSONバックアップをダウンロード' }).click()
    const download = await downloadPromise

    // ファイル名は genka-dentaku-backup-YYYYMMDD.json。
    expect(download.suggestedFilename()).toMatch(/^genka-dentaku-backup-\d{8}\.json$/)

    // 中身はバックアップエンベロープ（app マーカー + サンプルメニューを含む状態）。
    const path = await download.path()
    const parsed = JSON.parse(await readFile(path, 'utf-8'))
    expect(parsed.app).toBe('genka-dentaku')
    expect(parsed.state.menus.some((m: { name: string }) => m.name === '唐揚げ定食')).toBe(true)
  })
})
