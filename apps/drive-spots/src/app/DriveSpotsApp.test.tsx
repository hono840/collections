import { act, getDefaultNormalizer, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedData } from '@/lib/spots/seed'
import type { Spot, SpotsData } from '@/lib/spots/types'
import { DriveSpotsApp } from './DriveSpotsApp'

// Acceptance tests for docs/product/spec.md (AC1-AC16, AC18 partly, AC22), driven through the UI only:
// roles, accessible names, labels and visible Japanese text. No CSS classes, no test ids.
//
// UI contract these tests rely on (beyond the spec text):
// - Tabs and category chips (list + add form) are <button>s exposing the selection with aria-pressed.
// - Screens are rendered conditionally (only the current screen is in the DOM).
// - A spot card is a <button> whose text is "<mark><name><region>・<category>".
// - The detail shows the spot name as a heading, and each info tile keeps its label and value
//   inside one parent element.

type User = ReturnType<typeof userEvent.setup>

const STORAGE_KEY = 'drive-spots:v1'
const BACKUP_KEY = 'drive-spots:v1:backup'
const NOT_PERSISTENT_NOTICE = 'この端末では保存できません（再読み込みで消えます）'
const EMPTY_TITLE = 'まだありません'
const EMPTY_DESCRIPTION = '行ったスポットは、詳細画面の「行った！」ボタンでここに移ります'
const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'
const DELETE_LABEL = 'このスポットを削除'
const DELETE_CONFIRM_LABEL = 'もう一度押すと削除します'
const MARK_DONE_LABEL = '行った！にする'
const MARK_WANT_LABEL = '「行きたい」に戻す'
const BACK_LABEL = '一覧にもどる'

const SEED_NAMES = [
  'ヤビツ峠',
  '箱根ターンパイク',
  '箱根スカイライン',
  '富士スピードウェイ',
  '伊豆スカイライン',
  '西伊豆スカイライン',
  '奥多摩',
  '首都高（都心環状線）',
  '赤城山',
  '榛名山',
  '碓氷峠',
  '志賀草津高原ルート',
  'ビーナスライン',
  'いろは坂',
  '中禅寺湖スカイライン',
  '筑波パープルライン',
  '銚子ドーバーライン',
  '九十九里浜',
  '伊吹山ドライブウェイ',
]

const CHIP_LABELS = ['すべて', '峠', '絶景ロード', '海沿い', 'サーキット', '都市高速']
const CATEGORY_LABELS = ['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速']

// The "地域・種類" line is what tells a spot card apart from the other buttons on the list.
const CATEGORY_LINE_PATTERN = /・(峠|絶景ロード|海沿い|サーキット|都市高速)/
const WANT_TAB_NAME = /^行きたい\s*\d+$/
const DONE_TAB_NAME = /^行った\s*\d+$/

// ---------- rendering ----------

/** Renders the app and waits until the saved data has been read (useSpotsData().ready). */
async function renderApp() {
  const user = userEvent.setup()
  const view = render(<DriveSpotsApp />)
  await screen.findByRole('button', { name: WANT_TAB_NAME })
  return { user, ...view }
}

// ---------- list screen ----------

function getWantTab(): HTMLElement {
  return screen.getByRole('button', { name: WANT_TAB_NAME })
}

function getDoneTab(): HTMLElement {
  return screen.getByRole('button', { name: DONE_TAB_NAME })
}

function expectTabCounts(wantCount: number, doneCount: number) {
  expect(getWantTab()).toHaveAccessibleName(new RegExp(`^行きたい\\s*${wantCount}$`))
  expect(getDoneTab()).toHaveAccessibleName(new RegExp(`^行った\\s*${doneCount}$`))
}

function expectSelected(element: HTMLElement) {
  expect(element).toBePressed()
}

function expectNotSelected(element: HTMLElement) {
  expect(element).toHaveAttribute('aria-pressed', 'false')
}

function getChip(label: string): HTMLElement {
  return screen.getByRole('button', { name: label })
}

/** Spot cards on the list, in document order. */
function getCardButtons(): HTMLElement[] {
  return screen
    .queryAllByRole('button')
    .filter((button) => CATEGORY_LINE_PATTERN.test(button.textContent ?? ''))
}

function queryCard(spotName: string): HTMLElement | null {
  return screen.queryByText(spotName)?.closest('button') ?? null
}

function getCard(spotName: string): HTMLElement {
  const card = queryCard(spotName)
  if (card === null) {
    throw new Error(`No spot card named "${spotName}" is on the screen`)
  }
  return card
}

function expectFollows(earlierElement: HTMLElement, laterElement: HTMLElement) {
  expect(
    earlierElement.compareDocumentPosition(laterElement) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
}

function getNotice(): HTMLElement | null {
  return screen.queryByText(NOT_PERSISTENT_NOTICE)
}

// ---------- detail screen ----------

async function openDetail(user: User, spotName: string) {
  await user.click(getCard(spotName))
  await screen.findByRole('heading', { name: spotName })
}

async function backToList(user: User) {
  await user.click(screen.getByRole('button', { name: BACK_LABEL }))
  await screen.findByRole('button', { name: WANT_TAB_NAME })
}

/** The info tile (地域 / 距離 / 時期) that contains the given label. */
function getInfoTile(label: string): HTMLElement {
  const tile = screen.getByText(label).parentElement
  if (tile === null) {
    throw new Error(`No info tile for "${label}"`)
  }
  return tile
}

async function markDone(user: User, spotName: string) {
  await openDetail(user, spotName)
  await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))
  await backToList(user)
}

// ---------- add screen ----------

type FormValues = {
  name?: string
  category?: string
  region?: string
  distanceKm?: string
  season?: string
  memo?: string
}

async function openAddForm(user: User) {
  await user.click(screen.getByRole('button', { name: 'スポットを追加' }))
  await screen.findByLabelText('スポット名（必須）')
}

function getNameInput(): HTMLElement {
  return screen.getByLabelText('スポット名（必須）')
}

async function fillAddForm(user: User, values: FormValues) {
  if (values.name) await user.type(getNameInput(), values.name)
  if (values.category) await user.click(screen.getByRole('button', { name: values.category }))
  if (values.region) await user.type(screen.getByLabelText('地域'), values.region)
  if (values.distanceKm) await user.type(screen.getByLabelText('片道の距離（km）'), values.distanceKm)
  if (values.season) await user.type(screen.getByLabelText('おすすめ時期'), values.season)
  if (values.memo) await user.type(screen.getByLabelText('メモ'), values.memo)
}

async function addSpotThroughForm(user: User, values: FormValues, saveButtonName = '保存する') {
  await openAddForm(user)
  await fillAddForm(user, values)
  await user.click(screen.getByRole('button', { name: saveButtonName }))
  await screen.findByRole('button', { name: WANT_TAB_NAME })
}

// ---------- storage ----------

function readSavedData(): SpotsData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as SpotsData)
}

function makeSpot(overrides: Partial<Spot> & Pick<Spot, 'id' | 'name'>): Spot {
  return {
    region: '神奈川',
    category: '峠',
    distanceKm: '',
    season: '',
    memo: '',
    done: false,
    ...overrides,
  }
}

function throwSecurityError(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

function throwQuotaExceededError(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

/** Makes Storage#setItem throw for one key only; every other key is written normally. */
function failSetItemFor(failingKey: string) {
  const originalSetItem = Storage.prototype.setItem
  return vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function setItemExceptFailingKey(this: Storage, key: string, value: string) {
      if (key === failingKey) throwQuotaExceededError()
      originalSetItem.call(this, key, value)
    })
}

// ---------- another tab (AC22) ----------

const OTHER_TAB_SPOT_NAME = '房総フラワーライン'

/** What another tab saves after this one loaded: the seed plus one new spot (id 20, nextId 21). */
function createOtherTabData(): SpotsData {
  const otherTabSpot = makeSpot({ id: 20, name: OTHER_TAB_SPOT_NAME, region: '千葉', category: '海沿い' })
  return { version: 1, nextId: 21, spots: [otherTabSpot, ...createSeedData().spots] }
}

/** Writes like another tab would. jsdom never fires `storage` in the writing window itself. */
function saveFromAnotherTab(data: SpotsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function dispatchStorageEvent(key: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key }))
  })
}

function dispatchPageShow(persisted: boolean) {
  act(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }))
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('DriveSpotsApp', () => {
  describe('AC1: initial data', () => {
    it('AC1: shows the 19 seed spots in design order under 行きたい when nothing is saved', async () => {
      await renderApp()

      expect(screen.getByRole('heading', { name: '行きたい道ノート' })).toBeInTheDocument()
      expectSelected(getWantTab())
      const cards = getCardButtons()
      expect(cards).toHaveLength(19)
      cards.forEach((card, index) => {
        expect(card).toHaveTextContent(SEED_NAMES[index])
      })
    })

    it('AC1/AC15: does not show the cannot-save notice when localStorage works', async () => {
      await renderApp()

      expect(getNotice()).not.toBeInTheDocument()
    })
  })

  describe('AC2: tabs', () => {
    it('AC2: shows 行きたい 19 / 行った 0 with 行きたい selected at start', async () => {
      await renderApp()

      expectTabCounts(19, 0)
      expectSelected(getWantTab())
      expectNotSelected(getDoneTab())
    })

    it('AC2: switches between 行きたい and 行った', async () => {
      const { user } = await renderApp()
      await markDone(user, '奥多摩')

      await user.click(getDoneTab())

      expectSelected(getDoneTab())
      expectNotSelected(getWantTab())
      expect(getCardButtons()).toHaveLength(1)
      expect(getCard('奥多摩')).toBeInTheDocument()

      await user.click(getWantTab())

      expectSelected(getWantTab())
      expectNotSelected(getDoneTab())
      expect(getCardButtons()).toHaveLength(18)
      expect(queryCard('奥多摩')).not.toBeInTheDocument()
    })

    it('AC2: tab counts are totals and ignore the category filter', async () => {
      const { user } = await renderApp()
      await markDone(user, '銚子ドーバーライン')

      await user.click(getChip('峠'))

      expectTabCounts(18, 1)
      expect(getCardButtons()).toHaveLength(6)
    })
  })

  describe('AC3: category chips', () => {
    it('AC3: shows the chips すべて / 峠 / 絶景ロード / 海沿い / サーキット / 都市高速 in order, すべて selected', async () => {
      await renderApp()

      const chips = CHIP_LABELS.map((label) => getChip(label))
      chips.slice(1).forEach((chip, index) => {
        expectFollows(chips[index], chip)
      })
      expectSelected(getChip('すべて'))
      for (const label of CATEGORY_LABELS) {
        expectNotSelected(getChip(label))
      }
    })

    it.each([
      ['峠', 6],
      ['絶景ロード', 9],
      ['海沿い', 2],
      ['サーキット', 1],
      ['都市高速', 1],
    ])('AC3: the %s chip shows only that category (%i spots)', async (category, expectedCount) => {
      const { user } = await renderApp()

      await user.click(getChip(category))

      expectSelected(getChip(category))
      expectNotSelected(getChip('すべて'))
      const cards = getCardButtons()
      expect(cards).toHaveLength(expectedCount)
      for (const card of cards) {
        expect(card).toHaveTextContent(new RegExp(`・${category}$`))
      }
    })

    it('AC3: すべて shows every spot again', async () => {
      const { user } = await renderApp()
      await user.click(getChip('海沿い'))

      await user.click(getChip('すべて'))

      expectSelected(getChip('すべて'))
      expect(getCardButtons()).toHaveLength(19)
    })

    it('AC3: combines the tab and the category with AND', async () => {
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      await markDone(user, '箱根ターンパイク')

      await user.click(getChip('峠'))
      expect(getCardButtons()).toHaveLength(5)
      expect(queryCard('ヤビツ峠')).not.toBeInTheDocument()

      await user.click(getDoneTab())
      expect(getCardButtons()).toHaveLength(1)
      expect(getCard('ヤビツ峠')).toBeInTheDocument()

      await user.click(getChip('絶景ロード'))
      expect(getCardButtons()).toHaveLength(1)
      expect(getCard('箱根ターンパイク')).toBeInTheDocument()
    })
  })

  describe('AC4: spot cards', () => {
    it.each([
      ['ヤビツ峠', /^峠\s*ヤビツ峠\s*神奈川・峠/],
      ['箱根ターンパイク', /^景\s*箱根ターンパイク\s*神奈川・絶景ロード/],
      ['銚子ドーバーライン', /^海\s*銚子ドーバーライン\s*千葉・海沿い/],
      ['富士スピードウェイ', /^走\s*富士スピードウェイ\s*静岡・サーキット/],
      ['首都高（都心環状線）', /^高\s*首都高（都心環状線）\s*東京・都市高速/],
    ])('AC4: the %s card shows its mark, name and 地域・種類', async (spotName, expectedText) => {
      await renderApp()

      expect(getCard(spotName)).toHaveTextContent(expectedText)
    })

    it('AC4: pressing a card opens its detail screen', async () => {
      const { user } = await renderApp()

      await user.click(getCard('碓氷峠'))

      expect(await screen.findByRole('heading', { name: '碓氷峠' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: WANT_TAB_NAME })).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(0)
    })
  })

  describe('AC5: empty state', () => {
    it('AC5: shows まだありません and the design description when the tab is empty', async () => {
      const { user } = await renderApp()
      expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument()

      await user.click(getDoneTab())

      expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
      expect(document.body).toHaveTextContent(EMPTY_DESCRIPTION)
      expect(getCardButtons()).toHaveLength(0)
    })

    it('AC5: shows the empty state when the tab × category combination has no spots', async () => {
      const { user } = await renderApp()
      await markDone(user, '富士スピードウェイ')

      await user.click(getChip('サーキット'))

      expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(0)
    })
  })

  describe('AC6: detail screen', () => {
    it('AC6: shows the category badge, name, region and 未入力 for an empty distance and season', async () => {
      const { user } = await renderApp()

      await openDetail(user, 'ヤビツ峠')

      expect(screen.getByRole('heading', { name: 'ヤビツ峠' })).toBeInTheDocument()
      expect(screen.getByText('峠')).toBeInTheDocument()
      expect(getInfoTile('地域')).toHaveTextContent(/^地域\s*神奈川$/)
      expect(getInfoTile('自宅からの距離（片道）')).toHaveTextContent(
        /^自宅からの距離（片道）\s*未入力$/,
      )
      expect(getInfoTile('おすすめ時期')).toHaveTextContent(/^おすすめ時期\s*未入力$/)
      expect(screen.getByText('メモ')).toBeInTheDocument()
      expect(screen.getByText('峠のホームコースにしたい')).toBeInTheDocument()
    })

    it('AC6: does not show the 行った badge for a 行きたい spot', async () => {
      const { user } = await renderApp()

      await openDetail(user, 'ヤビツ峠')

      expect(screen.queryByText('行った')).not.toBeInTheDocument()
    })

    it("AC6: shows 'メモはまだありません' when the memo is empty", async () => {
      const { user } = await renderApp()

      await openDetail(user, '箱根ターンパイク')

      expect(screen.getByText('メモはまだありません')).toBeInTheDocument()
      expect(screen.getByText('絶景ロード')).toBeInTheDocument()
    })

    it("AC6: shows '約 N km', the season and a multi-line memo with its line break", async () => {
      const { user } = await renderApp()
      await addSpotThroughForm(user, {
        name: '大観山',
        category: '絶景ロード',
        region: '神奈川',
        distanceKm: '60',
        season: '紅葉の季節',
        memo: '一行目{Enter}二行目',
      })

      await openDetail(user, '大観山')

      expect(getInfoTile('自宅からの距離（片道）')).toHaveTextContent(
        /^自宅からの距離（片道）\s*約 60 km$/,
      )
      expect(getInfoTile('おすすめ時期')).toHaveTextContent(/^おすすめ時期\s*紅葉の季節$/)
      expect(
        screen.getByText('一行目\n二行目', {
          normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
        }),
      ).toBeInTheDocument()
    })

    it("AC6: the back button's accessible name is 一覧にもどる and it returns to the list as it was", async () => {
      const { user } = await renderApp()
      await user.click(getChip('絶景ロード'))
      await openDetail(user, '箱根ターンパイク')

      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(await screen.findByRole('button', { name: WANT_TAB_NAME })).toBeInTheDocument()
      expectSelected(getWantTab())
      expectSelected(getChip('絶景ロード'))
      expect(getCardButtons()).toHaveLength(9)
    })
  })

  describe('AC7: toggle done', () => {
    it('AC7: 行った！にする moves the spot to the 行った tab', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')

      await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))

      expect(screen.getByRole('button', { name: MARK_WANT_LABEL })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: MARK_DONE_LABEL })).not.toBeInTheDocument()
      expect(screen.getByText('行った')).toBeInTheDocument()

      await backToList(user)

      expectTabCounts(18, 1)
      expect(queryCard('ヤビツ峠')).not.toBeInTheDocument()
      await user.click(getDoneTab())
      expect(getCard('ヤビツ峠')).toBeInTheDocument()
    })

    it('AC7: 「行きたい」に戻す moves the spot back to the 行きたい tab', async () => {
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      await user.click(getDoneTab())
      await openDetail(user, 'ヤビツ峠')

      await user.click(screen.getByRole('button', { name: MARK_WANT_LABEL }))

      expect(screen.getByRole('button', { name: MARK_DONE_LABEL })).toBeInTheDocument()
      expect(screen.queryByText('行った')).not.toBeInTheDocument()

      await backToList(user)

      expectTabCounts(19, 0)
      expect(getCardButtons()).toHaveLength(0)
      await user.click(getWantTab())
      expect(getCardButtons()[0]).toHaveTextContent('ヤビツ峠')
    })
  })

  describe('AC8: two-press delete', () => {
    it('AC8: the first press asks again, the second press deletes and returns to the list', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { user } = await renderApp()
      await openDetail(user, '奥多摩')

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      expect(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: DELETE_LABEL })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '奥多摩' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))

      expect(await screen.findByRole('button', { name: WANT_TAB_NAME })).toBeInTheDocument()
      expect(queryCard('奥多摩')).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(18)
      expectTabCounts(18, 0)
      expect(confirmSpy).not.toHaveBeenCalled()
    })

    it('AC8: leaving the detail cancels the first press', async () => {
      const { user } = await renderApp()
      await openDetail(user, '奥多摩')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await backToList(user)

      await openDetail(user, '奥多摩')

      expect(screen.getByRole('button', { name: DELETE_LABEL })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: DELETE_CONFIRM_LABEL })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await backToList(user)
      await openDetail(user, '赤城山')

      expect(screen.getByRole('button', { name: DELETE_LABEL })).toBeInTheDocument()

      await backToList(user)
      expect(getCardButtons()).toHaveLength(19)
    })
  })

  describe('AC9: add form', () => {
    it('AC9: スポットを追加 opens the form with all fields and 峠 as the default category', async () => {
      const { user } = await renderApp()

      await openAddForm(user)

      expect(getNameInput()).toHaveValue('')
      expect(screen.getByLabelText('地域')).toHaveValue('')
      expect(screen.getByLabelText('片道の距離（km）')).toBeInTheDocument()
      expect(screen.getByLabelText('おすすめ時期')).toHaveValue('')
      expect(screen.getByLabelText('メモ')).toHaveValue('')
      expect(screen.getByText('種類')).toBeInTheDocument()
      expectSelected(screen.getByRole('button', { name: '峠' }))
      for (const label of CATEGORY_LABELS.slice(1)) {
        expectNotSelected(screen.getByRole('button', { name: label }))
      }
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '保存する' })).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(0)
    })

    it('AC9: picking a category selects only that category', async () => {
      const { user } = await renderApp()
      await openAddForm(user)

      await user.click(screen.getByRole('button', { name: '海沿い' }))

      expectSelected(screen.getByRole('button', { name: '海沿い' }))
      expectNotSelected(screen.getByRole('button', { name: '峠' }))
    })

    it('AC9: キャンセル returns to the list and discards the input', async () => {
      const { user } = await renderApp()
      await openAddForm(user)
      await fillAddForm(user, { name: '捨てるスポット', category: '海沿い', region: '千葉' })

      await user.click(screen.getByRole('button', { name: 'キャンセル' }))

      expect(await screen.findByRole('button', { name: WANT_TAB_NAME })).toBeInTheDocument()
      expectTabCounts(19, 0)
      expect(queryCard('捨てるスポット')).not.toBeInTheDocument()

      await openAddForm(user)

      expect(getNameInput()).toHaveValue('')
      expect(screen.getByLabelText('地域')).toHaveValue('')
      expectSelected(screen.getByRole('button', { name: '峠' }))
    })
  })

  describe('AC10: name is required', () => {
    it.each(['保存', '保存する'])(
      `AC10: %s with an empty name shows '${NAME_REQUIRED_MESSAGE}' and does not save`,
      async (saveButtonName) => {
        const { user } = await renderApp()
        await openAddForm(user)
        expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: saveButtonName }))

        expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
        expect(getNameInput()).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'キャンセル' }))
        await screen.findByRole('button', { name: WANT_TAB_NAME })
        expectTabCounts(19, 0)
      },
    )

    it.each(['保存', '保存する'])('AC10: %s with a whitespace-only name is rejected', async (saveButtonName) => {
      const { user } = await renderApp()
      await openAddForm(user)
      await user.type(getNameInput(), '   ')

      await user.click(screen.getByRole('button', { name: saveButtonName }))

      expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
      expect(getNameInput()).toBeInTheDocument()
    })

    it('AC10: the name error disappears when the name is typed again', async () => {
      const { user } = await renderApp()
      await openAddForm(user)
      await user.click(screen.getByRole('button', { name: '保存する' }))
      expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()

      await user.type(getNameInput(), '大')

      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
    })
  })

  describe('AC11: distance', () => {
    it(`AC11: a negative distance shows '${DISTANCE_INVALID_MESSAGE}' and does not save`, async () => {
      const { user } = await renderApp()
      await openAddForm(user)
      await fillAddForm(user, { name: '大観山', distanceKm: '-1' })

      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(screen.getByText(DISTANCE_INVALID_MESSAGE)).toBeInTheDocument()
      expect(getNameInput()).toHaveValue('大観山')

      await user.click(screen.getByRole('button', { name: 'キャンセル' }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })
      expect(queryCard('大観山')).not.toBeInTheDocument()
    })

    it('AC11: a distance of 0 or more is accepted after fixing the input', async () => {
      const { user } = await renderApp()
      await openAddForm(user)
      await fillAddForm(user, { name: '大観山', distanceKm: '-1' })
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(screen.getByText(DISTANCE_INVALID_MESSAGE)).toBeInTheDocument()

      const distanceInput = screen.getByLabelText('片道の距離（km）')
      await user.clear(distanceInput)
      await user.type(distanceInput, '12.5')
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(await screen.findByRole('button', { name: WANT_TAB_NAME })).toBeInTheDocument()
      expect(getCard('大観山')).toBeInTheDocument()
      expect(readSavedData()?.spots[0]).toMatchObject({ name: '大観山', distanceKm: '12.5' })
    })

    it('AC11: an empty distance is accepted', async () => {
      const { user } = await renderApp()

      await addSpotThroughForm(user, { name: '大観山' }, '保存')

      expect(getCard('大観山')).toBeInTheDocument()
      expect(readSavedData()?.spots[0]).toMatchObject({ name: '大観山', distanceKm: '' })
    })
  })

  describe('AC12: saving a new spot', () => {
    it('AC12: the new spot goes to the top, the tab resets to 行きたい and the category to すべて', async () => {
      const { user } = await renderApp()
      await user.click(getDoneTab())
      await user.click(getChip('峠'))

      await addSpotThroughForm(user, { name: '大観山', category: '海沿い', distanceKm: '60' })

      expectSelected(getWantTab())
      expectNotSelected(getDoneTab())
      expectSelected(getChip('すべて'))
      expectNotSelected(getChip('峠'))
      expectTabCounts(20, 0)
      const cards = getCardButtons()
      expect(cards).toHaveLength(20)
      expect(cards[0]).toHaveTextContent(/^海\s*大観山\s*未入力・海沿い/)
      expect(cards[1]).toHaveTextContent('ヤビツ峠')
    })

    it('AC12: the header 保存 button saves as well', async () => {
      const { user } = await renderApp()

      await addSpotThroughForm(user, { name: '大観山', region: '神奈川' }, '保存')

      expect(getCardButtons()[0]).toHaveTextContent(/^峠\s*大観山\s*神奈川・峠/)
    })

    it("AC12: trims surrounding whitespace and uses '未入力' for an empty region", async () => {
      const { user } = await renderApp()

      await addSpotThroughForm(user, {
        name: '  大観山  ',
        category: '絶景ロード',
        region: '   ',
        distanceKm: '60',
        season: '  紅葉の季節  ',
        memo: '  早朝に行く  ',
      })

      expect(readSavedData()?.spots[0]).toEqual({
        id: 20,
        name: '大観山',
        region: '未入力',
        category: '絶景ロード',
        distanceKm: '60',
        season: '紅葉の季節',
        memo: '早朝に行く',
        done: false,
      })

      await openDetail(user, '大観山')

      expect(getInfoTile('地域')).toHaveTextContent(/^地域\s*未入力$/)
    })
  })

  describe('AC13: persistence', () => {
    it("AC13: adding, toggling and deleting are each saved under 'drive-spots:v1'", async () => {
      const { user } = await renderApp()

      await addSpotThroughForm(user, { name: '大観山', category: '絶景ロード' })

      let savedData = readSavedData()
      expect(savedData).toMatchObject({ version: 1, nextId: 21 })
      expect(savedData?.spots).toHaveLength(20)
      expect(savedData?.spots[0]).toMatchObject({ id: 20, name: '大観山', done: false })

      await markDone(user, 'ヤビツ峠')

      savedData = readSavedData()
      expect(savedData?.spots.find((spot) => spot.name === 'ヤビツ峠')).toMatchObject({
        id: 1,
        done: true,
      })

      await openDetail(user, '奥多摩')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })

      savedData = readSavedData()
      expect(savedData).toMatchObject({ version: 1, nextId: 21 })
      expect(savedData?.spots).toHaveLength(19)
      expect(savedData?.spots.map((spot) => spot.name)).not.toContain('奥多摩')
    })

    it('AC13: the changes are still there after the app is unmounted and rendered again', async () => {
      const { user, unmount } = await renderApp()
      await addSpotThroughForm(user, { name: '大観山', category: '絶景ロード' })
      await markDone(user, 'ヤビツ峠')
      await openDetail(user, '奥多摩')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })

      unmount()
      const { user: userAfterReload } = await renderApp()

      expectTabCounts(18, 1)
      expect(getCardButtons()[0]).toHaveTextContent('大観山')
      expect(queryCard('奥多摩')).not.toBeInTheDocument()
      await userAfterReload.click(getDoneTab())
      expect(getCard('ヤビツ峠')).toBeInTheDocument()
    })

    it('AC13: starts from valid saved data instead of the seed', async () => {
      const savedData: SpotsData = {
        version: 1,
        nextId: 31,
        spots: [
          makeSpot({ id: 30, name: '大観山', category: '絶景ロード' }),
          makeSpot({ id: 7, name: '奥多摩', region: '東京', done: true }),
        ],
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      await renderApp()

      expectTabCounts(1, 1)
      expect(getCardButtons()).toHaveLength(1)
      expect(getCard('大観山')).toBeInTheDocument()
      expect(queryCard('ヤビツ峠')).not.toBeInTheDocument()
    })

    it('AC13/AC5: a saved empty list stays empty (the seed is not restored)', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, nextId: 20, spots: [] } satisfies SpotsData),
      )

      await renderApp()

      expectTabCounts(0, 0)
      expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(0)
    })
  })

  describe('AC14: corrupt saved data', () => {
    it.each([
      ['broken JSON', '{"version":1,"nextId":'],
      ['a wrong version', JSON.stringify({ version: 2, nextId: 20, spots: [] })],
      ['a wrong shape', JSON.stringify({ items: ['ヤビツ峠'] })],
    ])(
      "AC14: with %s it starts from the seed and backs the original up to 'drive-spots:v1:backup'",
      async (_description, corruptRaw) => {
        window.localStorage.setItem(STORAGE_KEY, corruptRaw)

        await renderApp()

        expectTabCounts(19, 0)
        expect(getCardButtons()).toHaveLength(19)
        expect(window.localStorage.getItem(BACKUP_KEY)).toBe(corruptRaw)
        expect(getNotice()).not.toBeInTheDocument()
      },
    )

    it('AC14: when the backup cannot be written, shows the AC15 notice and an action keeps the original string', async () => {
      const corruptRaw = '{"version":1,"nextId":'
      window.localStorage.setItem(STORAGE_KEY, corruptRaw)
      failSetItemFor(BACKUP_KEY)
      const { user } = await renderApp()

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(19)

      await markDone(user, 'ヤビツ峠')

      expectTabCounts(18, 1)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(corruptRaw)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
      expect(getNotice()).toBeInTheDocument()
    })
  })

  describe('AC15: localStorage unavailable', () => {
    it('AC15: when localStorage throws, the app still works and shows the notice above the list', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwSecurityError)
      const { user } = await renderApp()

      const notice = await screen.findByText(NOT_PERSISTENT_NOTICE)
      const cards = getCardButtons()
      expect(cards).toHaveLength(19)
      expectFollows(notice, cards[0])

      await markDone(user, 'ヤビツ峠')
      await addSpotThroughForm(user, { name: '大観山' })

      expectTabCounts(19, 1)
      expect(getCardButtons()[0]).toHaveTextContent('大観山')
      expect(getNotice()).toBeInTheDocument()
    })

    it('AC15: also works when reading window.localStorage itself throws', async () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)
      const { user } = await renderApp()

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(19)

      await markDone(user, 'ヤビツ峠')

      expectTabCounts(18, 1)
    })

    it('AC15: shows the notice once a save fails (e.g. quota exceeded)', async () => {
      const { user } = await renderApp()
      expect(getNotice()).not.toBeInTheDocument()
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      await markDone(user, 'ヤビツ峠')

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expectTabCounts(18, 1)
    })

    it('AC15: when getItem throws but setItem works, actions do not overwrite what is saved', async () => {
      const savedRaw = JSON.stringify({
        version: 1,
        nextId: 31,
        spots: [makeSpot({ id: 30, name: '大観山', category: '絶景ロード' })],
      } satisfies SpotsData)
      window.localStorage.setItem(STORAGE_KEY, savedRaw)
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const { user } = await renderApp()

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(19)

      await markDone(user, 'ヤビツ峠')
      await addSpotThroughForm(user, { name: '一つ目' })

      expectTabCounts(19, 1)
      getItemSpy.mockRestore()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })
  })

  describe('AC22: other tabs and back/forward restore', () => {
    it("AC22: toggling here keeps a spot another tab saved meanwhile, and the other tab's spot shows after its storage event", async () => {
      const { user } = await renderApp()
      saveFromAnotherTab(createOtherTabData())

      await markDone(user, '奥多摩')

      const savedData = readSavedData()
      expect(savedData?.spots.find((spot) => spot.id === 20)).toMatchObject({
        name: OTHER_TAB_SPOT_NAME,
        done: false,
      })
      expect(savedData?.spots.find((spot) => spot.name === '奥多摩')).toMatchObject({ done: true })
      expect(savedData?.spots).toHaveLength(20)
      expect(savedData?.nextId).toBe(21)

      dispatchStorageEvent(STORAGE_KEY)

      expect(getCard(OTHER_TAB_SPOT_NAME)).toBeInTheDocument()
      expectTabCounts(19, 1)
    })

    it('AC22: a storage event shows what another tab saved, without any action here', async () => {
      await renderApp()
      saveFromAnotherTab(createOtherTabData())

      dispatchStorageEvent(STORAGE_KEY)

      expectTabCounts(20, 0)
      expect(getCardButtons()[0]).toHaveTextContent(OTHER_TAB_SPOT_NAME)
    })

    it('AC22: a storage event with key null (storage cleared or rewritten elsewhere) refreshes the list', async () => {
      await renderApp()
      saveFromAnotherTab(createOtherTabData())

      dispatchStorageEvent(null)

      expect(getCard(OTHER_TAB_SPOT_NAME)).toBeInTheDocument()
    })

    it('AC22/AC16: adding here after another tab added a spot gives the new spot the next id', async () => {
      const { user } = await renderApp()
      saveFromAnotherTab(createOtherTabData())

      await addSpotThroughForm(user, { name: '一つ目' })

      const savedData = readSavedData()
      expect(savedData?.spots.slice(0, 2).map((spot) => [spot.id, spot.name])).toEqual([
        [21, '一つ目'],
        [20, OTHER_TAB_SPOT_NAME],
      ])
      expect(savedData?.nextId).toBe(22)
      expectTabCounts(21, 0)
      expect(getCard(OTHER_TAB_SPOT_NAME)).toBeInTheDocument()
    })

    it('AC22: a page restored by back/forward (pageshow persisted) shows the latest saved data', async () => {
      await renderApp()
      saveFromAnotherTab(createOtherTabData())

      dispatchPageShow(true)

      expectTabCounts(20, 0)
      expect(getCard(OTHER_TAB_SPOT_NAME)).toBeInTheDocument()
    })

    it('AC22: a normal pageshow (persisted false) does not reload the list', async () => {
      await renderApp()
      saveFromAnotherTab(createOtherTabData())

      dispatchPageShow(false)

      expectTabCounts(19, 0)
      expect(queryCard(OTHER_TAB_SPOT_NAME)).not.toBeInTheDocument()
    })

    it('AC22: the open detail screen follows a change another tab saved for the same spot', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      const otherTabData = createSeedData()
      otherTabData.spots[0] = { ...otherTabData.spots[0], done: true }
      saveFromAnotherTab(otherTabData)

      dispatchStorageEvent(STORAGE_KEY)

      expect(screen.getByRole('heading', { name: 'ヤビツ峠' })).toBeInTheDocument()
      expect(screen.getByText('行った')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: MARK_WANT_LABEL })).toBeInTheDocument()
    })
  })

  describe('AC16: ids are never reused', () => {
    it('AC16: a spot added after deleting the newest spot gets a new id', async () => {
      const { user } = await renderApp()
      await openDetail(user, '伊吹山ドライブウェイ')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })
      expect(readSavedData()?.nextId).toBe(20)

      await addSpotThroughForm(user, { name: '一つ目' })
      await openDetail(user, '一つ目')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })
      await addSpotThroughForm(user, { name: '二つ目' })

      const savedData = readSavedData()
      expect(savedData?.spots[0]).toMatchObject({ id: 21, name: '二つ目' })
      expect(savedData?.nextId).toBe(22)
      expect(savedData?.spots.map((spot) => spot.id)).not.toContain(19)
      expect(savedData?.spots.map((spot) => spot.id)).not.toContain(20)
    })
  })

  describe('AC18: real controls (partial; focus visibility is CSS and not checked here)', () => {
    it('AC18: every button on the list, detail and add screens is a real <button>', async () => {
      const { user } = await renderApp()
      const expectRealButtons = () => {
        for (const button of screen.getAllByRole('button')) {
          expect(button).toBeInstanceOf(HTMLButtonElement)
        }
      }

      expectRealButtons()
      await openDetail(user, 'ヤビツ峠')
      expectRealButtons()
      await backToList(user)
      await openAddForm(user)
      expectRealButtons()
    })

    it('AC18: the add form uses labelled <input> and <textarea> elements', async () => {
      const { user } = await renderApp()

      await openAddForm(user)

      expect(getNameInput()).toBeInstanceOf(HTMLInputElement)
      expect(screen.getByLabelText('地域')).toBeInstanceOf(HTMLInputElement)
      expect(screen.getByLabelText('片道の距離（km）')).toBeInstanceOf(HTMLInputElement)
      expect(screen.getByLabelText('おすすめ時期')).toBeInstanceOf(HTMLInputElement)
      expect(screen.getByLabelText('メモ')).toBeInstanceOf(HTMLTextAreaElement)
    })
  })
})
