import { expect, test, type Page } from '@playwright/test'
import { createAdminClient } from '../helpers/supabase-test-users'
import {
  createE2eUser,
  hasSupabaseTestEnv,
  loginViaMagicLink,
  removeE2eUser,
  SKIP_REASON,
  type E2eUser,
} from './support/login'

// Sprint 3: drive records + road info + collection (architecture US-03 / US-04 / US-07 / US-09 record edit;
// PRD US-06, US-08, US-10, US-11). Needs a local Supabase (skipped without env; CEO: DB verified in Sprint 5).
// Roads are seeded with the service role (the road UI is covered by roads.spec.ts); drives go through the UI.
// GSI tiles are answered locally with a 1x1 PNG (architecture ch.19 #6).

const NOT_FOUND = 'ページが見つかりません'
const M06 = 'これはあなた自身の記録で、公式情報ではありません。お出かけ前に道路管理者の公式情報を確認してください。'
const STALE = '確認から1年以上たっています'
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

async function stubGsiTiles(page: Page) {
  await page.route('https://cyberjapandata.gsi.go.jp/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG }),
  )
}

async function acknowledgeSafetyNotice(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'はじめに' })
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: '確認しました' }).click()
    await expect(dialog).toBeHidden()
  }
}

async function signIn(page: Page, user: E2eUser) {
  await stubGsiTiles(page)
  await loginViaMagicLink(page, user.email)
  await page.goto('/roads')
  await acknowledgeSafetyNotice(page)
}

async function seedRoad(user: E2eUser, name: string, prefectureCode = 10, roadType = 'pass'): Promise<string> {
  const { data, error } = await createAdminClient()
    .from('roads')
    .insert({ user_id: user.id, name, prefecture_code: prefectureCode, road_type: roadType, start_lat: 36.35, start_lng: 138.7 })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** JST date `offsetDays` from today as YYYY-MM-DD. */
function jstDate(offsetDays: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date())
  const [year, month, day] = today.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10)
}

type NewDrive = {
  drivenOn: string
  overall: string // e.g. '4、良い'
  memo?: string
  roadInfo?: { item: string; option: string; memo?: string; confirmedOn?: string }
}

async function recordDrive(page: Page, roadId: string, drive: NewDrive) {
  await page.goto(`/roads/${roadId}/drives/new`)
  await expect(page.getByRole('heading', { level: 1, name: '走行記録を追加' })).toBeVisible()
  await page.getByLabel(/走行日/).fill(drive.drivenOn)
  await page.getByRole('radiogroup', { name: /^総合/ }).getByRole('radio', { name: drive.overall }).check()
  if (drive.memo) await page.getByRole('textbox', { name: /^メモ/ }).fill(drive.memo)
  if (drive.roadInfo) {
    const roadInfo = page.getByRole('group', { name: /^道の情報/ })
    if (drive.roadInfo.confirmedOn) await roadInfo.getByLabel(/確認日/).fill(drive.roadInfo.confirmedOn)
    await roadInfo
      .getByRole('group', { name: new RegExp(`^${drive.roadInfo.item}`) })
      .or(roadInfo.getByRole('radiogroup', { name: new RegExp(`^${drive.roadInfo.item}`) }))
      .getByRole('radio', { name: drive.roadInfo.option })
      .check()
    if (drive.roadInfo.memo) {
      await page.getByRole('textbox', { name: `${drive.roadInfo.item}のメモ` }).fill(drive.roadInfo.memo)
    }
  }
  await page.getByRole('button', { name: /保存/ }).click()
  await expect(page).toHaveURL(new RegExp(`/roads/${roadId}$`))
}

test.describe('drives: record, list, road info, edit, isolation', () => {
  test.skip(!hasSupabaseTestEnv, SKIP_REASON)

  let userA: E2eUser | undefined
  let userB: E2eUser | undefined

  test.beforeEach(async () => {
    userA = await createE2eUser('drives-a')
  })

  test.afterEach(async () => {
    await removeE2eUser(userA)
    await removeE2eUser(userB)
    userA = undefined
    userB = undefined
  })

  test('the record form shows the safety banner first and has no time / speed fields', async ({ page }) => {
    const roadId = await seedRoad(userA!, '碓氷峠')
    await signIn(page, userA!)
    await page.goto(`/roads/${roadId}/drives/new`)

    const form = page.getByRole('form', { name: '走行記録の登録フォーム' })
    await expect(form.getByRole('note').first()).toContainText('運転中は操作しないでください')
    await expect(page.locator('input[type="time"], input[type="datetime-local"]')).toHaveCount(0)
    await expect(page.getByLabel(/速度|タイム|時刻|所要時間/)).toHaveCount(0)
    await expect(page.getByLabel(/走行日/)).toHaveValue(jstDate(0))
  })

  test('future date and missing 総合 are rejected and nothing is saved (US-03)', async ({ page }) => {
    const roadId = await seedRoad(userA!, '碓氷峠')
    await signIn(page, userA!)
    await page.goto(`/roads/${roadId}/drives/new`)

    await page.getByRole('textbox', { name: /^メモ/ }).fill('残っていてほしい')
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByText('総合評価を選んでください')).toBeVisible()

    await page.getByLabel(/走行日/).fill(jstDate(1))
    await page.getByRole('radiogroup', { name: /^総合/ }).getByRole('radio', { name: '4、良い' }).check()
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByText('未来の日付は選べません')).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^メモ/ })).toHaveValue('残っていてほしい')
    await expect(page).toHaveURL(new RegExp(`/roads/${roadId}/drives/new$`))

    const { count } = await createAdminClient().from('drives').select('id', { count: 'exact', head: true }).eq('road_id', roadId)
    expect(count).toBe(0)
  })

  test('3 records entered out of order are listed newest first (US-07)', async ({ page }) => {
    const roadId = await seedRoad(userA!, '碓氷峠')
    await signIn(page, userA!)

    await recordDrive(page, roadId, { drivenOn: '2026-05-03', overall: '3、ふつう', memo: '五月' })
    await recordDrive(page, roadId, { drivenOn: '2026-09-14', overall: '5、とても良い', memo: '九月' })
    await recordDrive(page, roadId, { drivenOn: '2025-11-20', overall: '4、良い', memo: '去年の十一月' })

    const items = page.getByRole('list', { name: '走行記録' }).getByRole('listitem')
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toContainText('九月')
    await expect(items.nth(1)).toContainText('五月')
    await expect(items.nth(2)).toContainText('去年の十一月')
    await expect(page.getByText('走った回数 3回・最後 2026-09-14')).toBeVisible()
    await expect(page.getByRole('list', { name: '評価のまとめ' })).toContainText('4.0（3件の平均）')
  })

  test('road info: the newer confirmation wins, with the user-record note and the stale warning (US-04)', async ({
    page,
  }) => {
    const roadId = await seedRoad(userA!, '碓氷峠')
    await signIn(page, userA!)

    const old = jstDate(-400)
    await recordDrive(page, roadId, {
      drivenOn: old,
      overall: '3、ふつう',
      roadInfo: { item: '二輪通行止め', option: 'なし' },
    })
    await recordDrive(page, roadId, {
      drivenOn: jstDate(-30),
      overall: '4、良い',
      roadInfo: { item: '二輪通行止め', option: 'あり', memo: '土日のみ', confirmedOn: jstDate(-2) },
    })
    await recordDrive(page, roadId, {
      drivenOn: jstDate(-10),
      overall: '4、良い',
      roadInfo: { item: 'トイレ', option: 'あり', confirmedOn: old },
    })

    const region = page.getByRole('region', { name: /道の情報/ })
    await expect(region).toContainText(M06)
    await expect(region).toContainText('ユーザー記録')
    await expect(region).toContainText(`あり（土日のみ）・確認日 ${jstDate(-2)}`)
    await expect(region.getByText(STALE)).toHaveCount(1) // only トイレ (400 days)
  })

  test('the list shows the last driven date and the overall average; the collection counts it', async ({ page }) => {
    const roadId = await seedRoad(userA!, '碓氷峠', 10, 'pass')
    await seedRoad(userA!, '未走行の道', 22, 'skyline')
    await signIn(page, userA!)

    await recordDrive(page, roadId, { drivenOn: '2026-09-14', overall: '5、とても良い' })
    await recordDrive(page, roadId, { drivenOn: '2026-05-03', overall: '4、良い' })

    await page.goto('/roads')
    const list = page.getByRole('list', { name: '道のリスト' })
    const items = list.getByRole('listitem')
    await expect(items.first()).toContainText('碓氷峠') // driven roads first
    await expect(items.first()).toContainText('最終 2026-09-14')
    await expect(items.first()).toContainText(/総合\s*平均\s*4\.5/)
    await expect(items.first()).toContainText('記録 2件')
    await expect(items.nth(1)).toContainText('走行記録なし')

    const collection = page.getByRole('region', { name: '走った道のコレクション' })
    await expect(collection).toContainText(/走った道\s*1\s*本/)
    await expect(collection).toContainText(/走った都道府県\s*1\s*\/\s*47/)
  })

  test('editing a record keeps it on the same road and updates the detail (US-09 record edit)', async ({ page }) => {
    const roadId = await seedRoad(userA!, '碓氷峠')
    await signIn(page, userA!)
    await recordDrive(page, roadId, { drivenOn: '2026-09-14', overall: '4、良い', memo: '最初のメモ' })

    await page.getByRole('list', { name: '走行記録' }).getByRole('link', { name: /編集/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: '走行記録を編集' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /^メモ/ })).toHaveValue('最初のメモ')
    await page.getByRole('textbox', { name: /^メモ/ }).fill('書き直したメモ')
    await page.getByRole('button', { name: /保存/ }).click()

    await expect(page).toHaveURL(new RegExp(`/roads/${roadId}$`))
    await expect(page.getByText('書き直したメモ')).toBeVisible()
    await expect(page.getByText('最初のメモ')).toHaveCount(0)
  })

  test("another user's record form and edit page are 404 (US-01)", async ({ page }) => {
    const roadId = await seedRoad(userA!, 'Aの道')
    const { data } = await createAdminClient()
      .from('drives')
      .insert({ user_id: userA!.id, road_id: roadId, driven_on: '2026-09-14', rating_overall: 4 })
      .select('id')
      .single()

    userB = await createE2eUser('drives-b')
    await signIn(page, userB)

    await page.goto(`/roads/${roadId}/drives/new`)
    await expect(page.getByText(NOT_FOUND)).toBeVisible()
    await page.goto(`/roads/${roadId}/drives/${data!.id}/edit`)
    await expect(page.getByText(NOT_FOUND)).toBeVisible()
  })

  test('a drive id under the wrong road is 404', async ({ page }) => {
    const roadId = await seedRoad(userA!, '道1')
    const otherRoadId = await seedRoad(userA!, '道2')
    const { data } = await createAdminClient()
      .from('drives')
      .insert({ user_id: userA!.id, road_id: roadId, driven_on: '2026-09-14', rating_overall: 4 })
      .select('id')
      .single()
    await signIn(page, userA!)

    await page.goto(`/roads/${otherRoadId}/drives/${data!.id}/edit`)
    await expect(page.getByText(NOT_FOUND)).toBeVisible()
  })
})
