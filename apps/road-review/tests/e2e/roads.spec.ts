import { expect, test, type Page } from '@playwright/test'
import {
  createE2eUser,
  hasSupabaseTestEnv,
  loginViaMagicLink,
  removeE2eUser,
  SKIP_REASON,
  type E2eUser,
} from './support/login'

// Sprint 2: roads registration / edit + map (US-02, US-06, US-09 road edit, US-01 404).
// Map tiles are never fetched from GSI: every request to cyberjapandata.gsi.go.jp is answered
// locally with a 1x1 PNG (architecture 11.4 / 16 #12). The map is checked by marker count/names
// against the list, not by pixels.
//
// 404 note: with roads/loading.tsx the detail page streams, and Next.js then answers a notFound()
// with status 200 + noindex (Next 16 docs: file-conventions/not-found). So the 404 is checked by content.

const MAP_LABEL = '道の地図（同じ内容は下のリストにあります）'
const E01 = 'まだ道が登録されていません。最初の道を登録しましょう'
const NOT_FOUND = 'ページが見つかりません'
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

type TileLog = { requests: string[] }

async function stubGsiTiles(page: Page): Promise<TileLog> {
  const log: TileLog = { requests: [] }
  await page.route('https://cyberjapandata.gsi.go.jp/**', async (route) => {
    log.requests.push(route.request().url())
    await route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG })
  })
  return log
}

async function acknowledgeSafetyNotice(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'はじめに' })
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: '確認しました' }).click()
    await expect(dialog).toBeHidden()
  }
}

async function signIn(page: Page, user: E2eUser) {
  await loginViaMagicLink(page, user.email)
  await page.goto('/roads')
  await acknowledgeSafetyNotice(page)
}

/** On narrow screens the list/map are switched with a radio group (UX 2.3). */
async function showMap(page: Page) {
  const mapToggle = page.getByRole('radio', { name: '地図' })
  if (await mapToggle.count()) await mapToggle.check()
}

function roadList(page: Page) {
  return page.getByRole('list', { name: '道のリスト' })
}

function mapMarkers(page: Page) {
  return page.getByLabel(MAP_LABEL).locator('.leaflet-marker-icon')
}

type NewRoad = { name: string; prefecture: string; type: string; start: [string, string]; end?: [string, string] }

async function registerRoad(page: Page, road: NewRoad): Promise<string> {
  await page.goto('/roads/new')
  await expect(page.getByRole('heading', { level: 1, name: '道を登録' })).toBeVisible()

  await page.getByRole('textbox', { name: /道の名前/ }).fill(road.name)
  await page.getByRole('combobox', { name: /都道府県/ }).selectOption({ label: road.prefecture })
  await page.getByRole('group', { name: /種別/ }).getByRole('radio', { name: road.type }).check()

  const startGroup = page.getByRole('group', { name: /開始地点/ })
  await startGroup.getByLabel(/緯度/).fill(road.start[0])
  await startGroup.getByLabel(/経度/).fill(road.start[1])
  if (road.end) {
    const endGroup = page.getByRole('group', { name: /終了地点/ })
    await endGroup.getByLabel(/緯度/).fill(road.end[0])
    await endGroup.getByLabel(/経度/).fill(road.end[1])
  }

  await page.getByRole('button', { name: /保存/ }).click()
  await expect(page).toHaveURL(/\/roads\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1, name: road.name })).toBeVisible()
  return new URL(page.url()).pathname.split('/').at(-1)!
}

test.describe('roads: register, list + map, edit, isolation', () => {
  test.skip(!hasSupabaseTestEnv, SKIP_REASON)

  let userA: E2eUser | undefined
  let userB: E2eUser | undefined

  test.beforeEach(async () => {
    userA = await createE2eUser('roads-a')
  })

  test.afterEach(async () => {
    await removeE2eUser(userA)
    await removeE2eUser(userB)
    userA = undefined
    userB = undefined
  })

  test('0 roads shows the E-01 empty state with a 道を登録 link', async ({ page }) => {
    await stubGsiTiles(page)
    await signIn(page, userA!)

    await expect(page.getByText(E01)).toBeVisible()
    await page.getByRole('link', { name: '道を登録' }).first().click()
    await expect(page).toHaveURL(/\/roads\/new$/)
  })

  test('required errors are shown and nothing is saved', async ({ page }) => {
    await stubGsiTiles(page)
    await signIn(page, userA!)
    await page.goto('/roads/new')

    await page.getByRole('button', { name: /保存/ }).click()

    await expect(page.getByText('道の名前を入力してください')).toBeVisible()
    await expect(page.getByText('都道府県を選んでください')).toBeVisible()
    await expect(page.getByText('地図を動かして開始地点のピンを置いてください')).toBeVisible()
    await expect(page).toHaveURL(/\/roads\/new$/)

    await page.getByRole('textbox', { name: /道の名前/ }).fill('道'.repeat(51))
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByText('50文字以内で入力してください')).toBeVisible()
  })

  test('林道 shows the forest-road note on the form and on the detail page', async ({ page }) => {
    await stubGsiTiles(page)
    await signIn(page, userA!)
    await page.goto('/roads/new')

    const note = page.getByText(/^林道は、舗装されていない区間や道幅の狭い区間があったり/)
    await expect(note).toHaveCount(0)
    await page.getByRole('radio', { name: '林道' }).check()
    await expect(note).toBeVisible()
    await page.getByRole('radio', { name: '峠' }).check()
    await expect(note).toHaveCount(0)

    await registerRoad(page, {
      name: '大弛峠林道',
      prefecture: '山梨県',
      type: '林道',
      start: ['35.86', '138.73'],
    })
    await expect(page.getByText(/^林道は、舗装されていない区間や道幅の狭い区間があったり/)).toBeVisible()
  })

  test('register -> detail -> list; map markers match the list (count and names)', async ({ page }) => {
    const tiles = await stubGsiTiles(page)
    await signIn(page, userA!)

    const firstId = await registerRoad(page, {
      name: '碓氷峠',
      prefecture: '群馬県',
      type: '峠',
      start: ['36.35', '138.7'],
      end: ['36.4', '138.65'],
    })
    await expect(page.getByText('群馬県')).toBeVisible()
    await expect(page.getByText(/開始地点: 設定済み/)).toBeVisible()
    await expect(page.getByText(/終了地点: 設定済み/)).toBeVisible()

    await registerRoad(page, {
      name: '房総フラワーライン',
      prefecture: '千葉県',
      type: '海岸線',
      start: ['34.92', '139.83'],
    })

    await page.goto('/roads')
    const items = roadList(page).getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(roadList(page)).toContainText('碓氷峠')
    await expect(roadList(page)).toContainText('房総フラワーライン')
    await expect(roadList(page).getByRole('link', { name: /碓氷峠/ })).toHaveAttribute(
      'href',
      `/roads/${firstId}`,
    )

    await showMap(page)
    await expect(mapMarkers(page)).toHaveCount(await items.count())
    const titles = await mapMarkers(page).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('title')).sort(),
    )
    expect(titles).toEqual(['房総フラワーライン', '碓氷峠'].sort())

    // Attribution is always visible and links to the GSI tile list page.
    await expect(
      page.getByRole('link', { name: /国土地理院|地理院タイル/ }).first(),
    ).toHaveAttribute('href', 'https://maps.gsi.go.jp/development/ichiran.html')
    // Tiles were requested but answered locally (no real GSI traffic).
    expect(tiles.requests.length).toBeGreaterThan(0)
  })

  test('edit a road: change the name and clear the end pin', async ({ page }) => {
    await stubGsiTiles(page)
    await signIn(page, userA!)
    const roadId = await registerRoad(page, {
      name: '碓氷峠',
      prefecture: '群馬県',
      type: '峠',
      start: ['36.35', '138.7'],
      end: ['36.4', '138.65'],
    })

    await page.getByRole('link', { name: /編集/ }).click()
    await expect(page).toHaveURL(new RegExp(`/roads/${roadId}/edit$`))
    await expect(page.getByRole('heading', { level: 1, name: '道を編集' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /道の名前/ })).toHaveValue('碓氷峠')

    await page.getByRole('textbox', { name: /道の名前/ }).fill('碓氷峠旧道')
    await page.getByRole('button', { name: '終了ピンを消す' }).click()
    await page.getByRole('button', { name: /保存/ }).click()

    await expect(page).toHaveURL(new RegExp(`/roads/${roadId}$`))
    await expect(page.getByRole('heading', { level: 1, name: '碓氷峠旧道' })).toBeVisible()
    await expect(page.getByText(/終了地点: 未設定/)).toBeVisible()

    await page.goto('/roads')
    await expect(roadList(page)).toContainText('碓氷峠旧道')
  })

  test("another user's road (detail and edit) shows the same 404 as a missing id", async ({ page, browser }) => {
    await stubGsiTiles(page)
    await signIn(page, userA!)
    const roadId = await registerRoad(page, {
      name: '碓氷峠',
      prefecture: '群馬県',
      type: '峠',
      start: ['36.35', '138.7'],
    })

    userB = await createE2eUser('roads-b')
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await stubGsiTiles(pageB)
    await signIn(pageB, userB)

    for (const path of [`/roads/${roadId}`, `/roads/${roadId}/edit`]) {
      await pageB.goto(path)
      await expect(pageB.getByRole('heading', { name: NOT_FOUND })).toBeVisible()
      await expect(pageB.getByText('碓氷峠')).toHaveCount(0)
    }

    // A missing id looks exactly the same.
    await pageB.goto('/roads/00000000-0000-4000-8000-000000000000')
    await expect(pageB.getByRole('heading', { name: NOT_FOUND })).toBeVisible()

    // B's list does not contain A's road.
    await pageB.goto('/roads')
    await expect(pageB.getByText(E01)).toBeVisible()
    await contextB.close()
  })
})
