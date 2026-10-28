import { act, getDefaultNormalizer, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedData } from '@/lib/spots/seed'
import type { Spot, SpotsData } from '@/lib/spots/types'
import { DriveSpotsApp } from './DriveSpotsApp'

// Acceptance tests for docs/product/spec.md (AC1-AC16, AC18 partly, AC22, AC23-AC28, AC30-AC40), driven through
// the UI only: roles, accessible names, labels and visible Japanese text. No CSS classes, no test ids.
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
const LAST_BACKUP_KEY = 'drive-spots:v1:last-backup'
const APP_NAME = 'ドライブスポット帳'
const NOT_PERSISTENT_NOTICE = 'この端末では保存できません（再読み込みで消えます）'
const NEWER_VERSION_NOTICE =
  '新しい版のアプリで保存されたデータがあります。ページを再読み込みしてください（このままでは保存されません）'
const RESTORE_HINT = '前に使っていたデータは「バックアップ」から読み込めます'
const EMPTY_TITLE = 'まだありません'
const EMPTY_DESCRIPTION = '行ったスポットは、詳細画面の「行った！」ボタンでここに移ります'
const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'
const DELETE_LABEL = 'このスポットを削除'
const DELETE_CONFIRM_LABEL = 'もう一度押すと削除します'
const MARK_DONE_LABEL = '行った！にする'
const MARK_WANT_LABEL = '「行きたい」に戻す'
const BACK_LABEL = '一覧にもどる'
const EDIT_MEMO_LABEL = 'メモを編集'
const MEMO_FIELD_NAME = 'メモ'
const EMPTY_MEMO_TEXT = 'メモはまだありません'
const YABITSU_SEED_MEMO = '峠のホームコースにしたい'

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

// ---------- memo editing on the detail screen (AC23-AC29) ----------

function getMemoField(): HTMLElement {
  return screen.getByRole('textbox', { name: MEMO_FIELD_NAME })
}

function queryMemoField(): HTMLElement | null {
  return screen.queryByRole('textbox', { name: MEMO_FIELD_NAME })
}

function getEditMemoButton(): HTMLElement {
  return screen.getByRole('button', { name: EDIT_MEMO_LABEL })
}

async function startEditingMemo(user: User): Promise<HTMLElement> {
  await user.click(getEditMemoButton())
  return getMemoField()
}

/** Starts editing and replaces the draft with `text` (user-event syntax: {Enter} is a line break). */
async function typeMemoDraft(user: User, text: string): Promise<HTMLElement> {
  const memoField = await startEditingMemo(user)
  await user.clear(memoField)
  if (text !== '') await user.type(memoField, text)
  return memoField
}

async function saveMemo(user: User, text: string) {
  await typeMemoDraft(user, text)
  await user.click(screen.getByRole('button', { name: '保存' }))
}

/** Finds text exactly, line breaks included (the detail keeps the memo's line breaks, AC6). */
function getTextKeepingLineBreaks(text: string): HTMLElement {
  return screen.getByText(text, { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) })
}

/** The seed with the memo of one spot replaced. */
function createSeedWithMemo(id: number, memo: string): SpotsData {
  const seedData = createSeedData()
  return {
    ...seedData,
    spots: seedData.spots.map((spot) => (spot.id === id ? { ...spot, memo } : spot)),
  }
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

// ---------- backup (AC30-AC39) ----------

const BACKUP_BUTTON_NAME = /^バックアップ/
const BACKUP_LABEL = 'バックアップ'
const BACKUP_NEVER_LABEL = 'バックアップ（まだしていません）'
const BACKUP_STALE_LABEL = 'バックアップ（30日以上していません）'
const EXPORT_LABEL = 'ファイルに書き出す'
const IMPORT_LABEL = 'ファイルから読み込む'
const REPLACE_LABEL = '置き換える'
const CANCEL_IMPORT_LABEL = 'やめる'
const LAST_BACKUP_LABEL = '最後に書き出した日'
const INVALID_FILE_MESSAGE = 'ドライブスポット帳のバックアップファイルではないか、壊れています'
const NEWER_FILE_MESSAGE =
  '新しい版のアプリで作られたファイルです。ページを再読み込みしてから、もう一度読み込んでください'
const NOT_SAVED_AFTER_IMPORT_TEXT = 'この端末では保存できませんでした（再読み込みで消えます）'
const HTML_NAME = '<img src=x onerror=alert(1)>'
const HTML_MEMO = '<script>alert(1)</script>'

/** Local 2026-10-25 10:00: "now" in the backup tests (Date only is faked). */
const NOW = new Date(2026, 9, 25, 10, 0)
/** Local 2026-10-20 21:30: when the imported file was written. */
const FILE_EXPORTED_AT = new Date(2026, 9, 20, 21, 30)
const FILE_PREVIEW_TITLE = '2026年10月20日に書き出したファイル'

/** What the imported file holds: 行きたい 3 / 行った 2 and its own nextId 50. */
const IMPORT_FILE_DATA: SpotsData = {
  version: 1,
  nextId: 50,
  spots: [
    makeSpot({ id: 41, name: '道志みち', region: '山梨・神奈川', distanceKm: '80', memo: '朝早く出る' }),
    makeSpot({ id: 40, name: HTML_NAME, memo: HTML_MEMO }),
    makeSpot({ id: 33, name: '大観山', category: '絶景ロード' }),
    makeSpot({ id: 12, name: '碓氷峠', region: '群馬・長野', done: true }),
    makeSpot({ id: 7, name: '首都高（都心環状線）', region: '東京', category: '都市高速', done: true }),
  ],
}

/** Saved by a newer version of the app (AC30): a shape this version cannot read. */
const NEWER_VERSION_RAW = JSON.stringify({ version: 2, nextId: 40, places: [{ title: '大観山' }] })

/** Fakes Date only, so user-event and Testing Library keep their real timers. */
function fakeNow(now: Date = NOW) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
}

function getBackupButton(): HTMLElement {
  return screen.getByRole('button', { name: BACKUP_BUTTON_NAME })
}

async function openBackup(user: User) {
  await user.click(getBackupButton())
  await screen.findByRole('button', { name: EXPORT_LABEL })
}

async function backFromBackup(user: User) {
  await user.click(screen.getByRole('button', { name: BACK_LABEL }))
  await screen.findByRole('button', { name: WANT_TAB_NAME })
}

/** The 最後に書き出した日 box: its label and its value share one wrapper element. */
function getLastBackupTile(): HTMLElement {
  const tile = screen.getByText(LAST_BACKUP_LABEL).parentElement
  if (tile === null) {
    throw new Error(`No box for 「${LAST_BACKUP_LABEL}」`)
  }
  return tile
}

function createBackupFileText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      app: 'drive-spots',
      backupVersion: 1,
      exportedAt: FILE_EXPORTED_AT.toISOString(),
      data: IMPORT_FILE_DATA,
      ...overrides,
    },
    null,
    2,
  )
}

function createJsonFile(text: string, fileName = 'drive-spots-2026-10-20.json'): File {
  return new File([text], fileName, { type: 'application/json' })
}

async function chooseBackupFile(user: User, file: File) {
  await user.upload(screen.getByLabelText(IMPORT_LABEL), file)
}

/** On the backup screen: choose a valid file, check the preview appears, press 置き換える. */
async function importBackupFile(user: User) {
  await chooseBackupFile(user, createJsonFile(createBackupFileText()))
  await screen.findByText(FILE_PREVIEW_TITLE)
  await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))
  await screen.findByText('読み込みました（行きたい 3 / 行った 2）')
}

function getNewerVersionNotice(): HTMLElement | null {
  return screen.queryByText(NEWER_VERSION_NOTICE)
}

function getListRegion(): HTMLElement {
  return screen.getByRole('region', { name: APP_NAME })
}

/** The seed with the given spot marked 行った. */
function createSeedWithDone(id: number): SpotsData {
  const seedData = createSeedData()
  return { ...seedData, spots: seedData.spots.map((spot) => (spot.id === id ? { ...spot, done: true } : spot)) }
}

/** jsdom may not define the Blob URL statics; give vi.spyOn something to replace. */
function ensureObjectUrlStatics() {
  const urlStatics = URL as unknown as Record<string, unknown>
  if (typeof urlStatics.createObjectURL !== 'function') urlStatics.createObjectURL = () => ''
  if (typeof urlStatics.revokeObjectURL !== 'function') urlStatics.revokeObjectURL = () => undefined
}

/**
 * Records downloads instead of performing them: jsdom can neither create Blob URLs nor follow a
 * download link. `blobs` are the files handed to URL.createObjectURL, `downloads` the pressed links.
 */
function mockDownloads() {
  ensureObjectUrlStatics()
  const blobs: Blob[] = []
  const downloads: { fileName: string; href: string | null }[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((object) => {
    blobs.push(object as Blob)
    return `blob:drive-spots/${blobs.length}`
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function recordDownload(this: HTMLAnchorElement) {
    downloads.push({ fileName: this.download, href: this.getAttribute('href') })
  })
  return { blobs, downloads }
}

/** jsdom has no layout and no Element#scrollIntoView; the backup screen scrolls its preview into view. */
function ensureScrollIntoView() {
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => undefined
  }
}

beforeEach(() => {
  ensureScrollIntoView()
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('DriveSpotsApp', () => {
  describe('AC1: initial data', () => {
    it('AC1: shows the 19 seed spots in design order under 行きたい when nothing is saved', async () => {
      await renderApp()

      expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument()
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
    // version 2 and up is data from a newer version (AC30), see 'AC30: data saved by a newer version'.
    it.each([
      ['broken JSON', '{"version":1,"nextId":'],
      ["a version given as the string '2'", JSON.stringify({ version: '2', nextId: 20, spots: [] })],
      ['version 0', JSON.stringify({ version: 0, nextId: 20, spots: [] })],
      ['a wrong shape', JSON.stringify({ items: ['ヤビツ峠'] })],
      ['a nextId above 1,000,000,000 (AC16)', JSON.stringify({ version: 1, nextId: 1_000_000_001, spots: [] })],
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

  describe('AC23-AC28: editing the memo', () => {
    it('AC23/AC24: editing and saving shows the trimmed memo on the detail and returns focus to メモを編集', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')

      const memoField = await startEditingMemo(user)

      expect(memoField).toHaveValue(YABITSU_SEED_MEMO)
      expect(memoField).toHaveFocus()

      await user.clear(memoField)
      await user.type(memoField, '  朝7時に出発{Enter}菜の花台で休憩　')
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(getTextKeepingLineBreaks('朝7時に出発\n菜の花台で休憩')).toBeInTheDocument()
      expect(screen.queryByText(YABITSU_SEED_MEMO)).not.toBeInTheDocument()
      expect(queryMemoField()).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'キャンセル' })).not.toBeInTheDocument()
      expect(getEditMemoButton()).toHaveFocus()
      expect(screen.getByRole('heading', { name: 'ヤビツ峠' })).toBeInTheDocument()
    })

    it("AC24/AC26/AC13: saves only the trimmed memo under 'drive-spots:v1' (every other field, the order and nextId unchanged)", async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')

      await saveMemo(user, '  朝7時に出発{Enter}菜の花台で休憩　')

      expect(readSavedData()).toEqual(createSeedWithMemo(1, '朝7時に出発\n菜の花台で休憩'))
    })

    it('AC24: the saved memo is still there after the app is rendered again (reload)', async () => {
      const { user, unmount } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await saveMemo(user, '朝7時に出発{Enter}菜の花台で休憩')

      unmount()
      const { user: userAfterReload } = await renderApp()
      await openDetail(userAfterReload, 'ヤビツ峠')

      expect(getTextKeepingLineBreaks('朝7時に出発\n菜の花台で休憩')).toBeInTheDocument()
      expect(queryMemoField()).not.toBeInTheDocument()
      expect(await startEditingMemo(userAfterReload)).toHaveValue('朝7時に出発\n菜の花台で休憩')
    })

    it.each([
      ['an emptied text field', ''],
      ['only half- and full-width spaces', '　 '],
    ])(`AC24: saving %s empties the memo and shows '${EMPTY_MEMO_TEXT}'`, async (_description, typedText) => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')

      await saveMemo(user, typedText)

      expect(screen.getByText(EMPTY_MEMO_TEXT)).toBeInTheDocument()
      expect(screen.queryByText(YABITSU_SEED_MEMO)).not.toBeInTheDocument()
      expect(readSavedData()).toEqual(createSeedWithMemo(1, ''))
    })

    it('AC23/AC24: a spot without a memo can get one', async () => {
      const { user } = await renderApp()
      await openDetail(user, '箱根ターンパイク')
      expect(screen.getByText(EMPTY_MEMO_TEXT)).toBeInTheDocument()

      const memoField = await startEditingMemo(user)
      expect(memoField).toHaveValue('')
      await user.type(memoField, '大観山で休憩')
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText('大観山で休憩')).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_MEMO_TEXT)).not.toBeInTheDocument()
      expect(readSavedData()).toEqual(createSeedWithMemo(2, '大観山で休憩'))
    })

    it('AC26: only the memo changes: name, category, region, distance, season, 行った, ids, order and nextId stay', async () => {
      const savedData: SpotsData = {
        version: 1,
        nextId: 42,
        spots: [
          makeSpot({
            id: 30,
            name: '大観山',
            region: '神奈川',
            category: '絶景ロード',
            distanceKm: '60',
            season: '紅葉の季節',
            memo: '古いメモ',
            done: true,
          }),
          makeSpot({ id: 7, name: '奥多摩', region: '東京', memo: 'そのまま', done: true }),
          makeSpot({ id: 12, name: '銚子ドーバーライン', region: '千葉', category: '海沿い' }),
        ],
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))
      const { user } = await renderApp()
      await user.click(getDoneTab())
      await openDetail(user, '大観山')

      await saveMemo(user, '新しいメモ')

      expect(readSavedData()).toEqual({
        ...savedData,
        spots: [{ ...savedData.spots[0], memo: '新しいメモ' }, savedData.spots[1], savedData.spots[2]],
      })
      expect(screen.getByText('行った')).toBeInTheDocument()
      expect(screen.getByText('絶景ロード')).toBeInTheDocument()
      expect(getInfoTile('地域')).toHaveTextContent(/^地域\s*神奈川$/)
      expect(getInfoTile('自宅からの距離（片道）')).toHaveTextContent(
        /^自宅からの距離（片道）\s*約 60 km$/,
      )
      expect(getInfoTile('おすすめ時期')).toHaveTextContent(/^おすすめ時期\s*紅葉の季節$/)

      await backToList(user)

      expectSelected(getDoneTab())
      expectTabCounts(1, 2)
      expect(getCardButtons().map((card) => card.textContent)).toEqual([
        expect.stringContaining('大観山'),
        expect.stringContaining('奥多摩'),
      ])
    })

    it('AC25: キャンセル discards the draft, keeps the saved memo and returns focus to メモを編集', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await typeMemoDraft(user, '捨てる下書き')

      await user.click(screen.getByRole('button', { name: 'キャンセル' }))

      expect(screen.getByText(YABITSU_SEED_MEMO)).toBeInTheDocument()
      expect(screen.queryByText('捨てる下書き')).not.toBeInTheDocument()
      expect(queryMemoField()).not.toBeInTheDocument()
      expect(getEditMemoButton()).toHaveFocus()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()

      expect(await startEditingMemo(user)).toHaveValue(YABITSU_SEED_MEMO)
    })

    it('AC25: going back to the list while editing discards the draft (reopening is not in edit mode)', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await typeMemoDraft(user, '捨てる下書き')

      await backToList(user)

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()

      await openDetail(user, 'ヤビツ峠')

      expect(screen.getByText(YABITSU_SEED_MEMO)).toBeInTheDocument()
      expect(screen.queryByText('捨てる下書き')).not.toBeInTheDocument()
      expect(queryMemoField()).not.toBeInTheDocument()
      expect(getEditMemoButton()).toBeInTheDocument()
      expect(await startEditingMemo(user)).toHaveValue(YABITSU_SEED_MEMO)
    })

    it('AC25: a draft does not follow into the detail of another spot', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await typeMemoDraft(user, '捨てる下書き')
      await backToList(user)

      await openDetail(user, '志賀草津高原ルート')

      expect(queryMemoField()).not.toBeInTheDocument()
      expect(screen.getByText('冬は通行止めの期間あり。行く前に通れるか確認')).toBeInTheDocument()
      expect(await startEditingMemo(user)).toHaveValue('冬は通行止めの期間あり。行く前に通れるか確認')
    })

    it('AC25: 行った！にする while editing stays in edit mode with the draft, and 保存 then saves it', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await typeMemoDraft(user, '行く前に天気を確認')

      await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))

      expect(screen.getByRole('button', { name: MARK_WANT_LABEL })).toBeInTheDocument()
      expect(screen.getByText('行った')).toBeInTheDocument()
      expect(getMemoField()).toHaveValue('行く前に天気を確認')
      expect(readSavedData()).toEqual({
        ...createSeedData(),
        spots: createSeedData().spots.map((spot) => (spot.id === 1 ? { ...spot, done: true } : spot)),
      })

      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(screen.getByText('行く前に天気を確認')).toBeInTheDocument()
      expect(queryMemoField()).not.toBeInTheDocument()
      expect(readSavedData()?.spots.find((spot) => spot.id === 1)).toEqual({
        ...createSeedData().spots[0],
        memo: '行く前に天気を確認',
        done: true,
      })

      await backToList(user)

      expectTabCounts(18, 1)
    })

    it('AC27/AC22: saving keeps a spot another tab added meanwhile', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      saveFromAnotherTab(createOtherTabData())

      await saveMemo(user, '新しいメモ')

      const savedData = readSavedData()
      expect(savedData?.spots.find((spot) => spot.id === 20)).toMatchObject({ name: OTHER_TAB_SPOT_NAME })
      expect(savedData?.spots.find((spot) => spot.id === 1)).toMatchObject({
        name: 'ヤビツ峠',
        memo: '新しいメモ',
      })
      expect(savedData?.spots).toHaveLength(20)
      expect(savedData?.nextId).toBe(21)
      expect(screen.getByText('新しいメモ')).toBeInTheDocument()

      await backToList(user)

      expectTabCounts(20, 0)
      expect(getCard(OTHER_TAB_SPOT_NAME)).toBeInTheDocument()
    })

    it('AC27: when another tab deleted the spot, saving does not bring it back and the list is shown', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      await typeMemoDraft(user, '新しいメモ')
      const seedData = createSeedData()
      const otherTabData: SpotsData = {
        ...seedData,
        spots: seedData.spots.filter((spot) => spot.id !== 1),
      }
      saveFromAnotherTab(otherTabData)

      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(await screen.findByRole('button', { name: WANT_TAB_NAME })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'ヤビツ峠' })).not.toBeInTheDocument()
      expect(queryCard('ヤビツ峠')).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(18)
      expectTabCounts(18, 0)
      const savedData = readSavedData()
      expect(savedData).toEqual(otherTabData)
      expect(savedData?.spots.find((spot) => spot.id === 1)).toBeUndefined()
    })

    it('AC28/AC15: when localStorage throws, a saved memo still changes on the screen and nothing is written', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwSecurityError)
      const { user } = await renderApp()
      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      await openDetail(user, 'ヤビツ峠')

      await saveMemo(user, '  新しいメモ  ')

      expect(screen.getByText('新しいメモ')).toBeInTheDocument()
      expect(screen.queryByText(YABITSU_SEED_MEMO)).not.toBeInTheDocument()

      await backToList(user)

      expect(getNotice()).toBeInTheDocument()

      await openDetail(user, 'ヤビツ峠')

      expect(screen.getByText('新しいメモ')).toBeInTheDocument()
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC28/AC15: when getItem throws but setItem works, saving a memo does not overwrite what is saved', async () => {
      const savedRaw = JSON.stringify({
        version: 1,
        nextId: 31,
        spots: [makeSpot({ id: 30, name: '大観山', category: '絶景ロード' })],
      } satisfies SpotsData)
      window.localStorage.setItem(STORAGE_KEY, savedRaw)
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const { user } = await renderApp()
      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      await openDetail(user, 'ヤビツ峠')

      await saveMemo(user, '新しいメモ')

      expect(screen.getByText('新しいメモ')).toBeInTheDocument()
      getItemSpy.mockRestore()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC28/AC15: when the save fails (quota exceeded), the memo still changes and the notice appears', async () => {
      const { user } = await renderApp()
      await openDetail(user, 'ヤビツ峠')
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      await saveMemo(user, '新しいメモ')

      expect(screen.getByText('新しいメモ')).toBeInTheDocument()

      await backToList(user)

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getCard('ヤビツ峠')).toBeInTheDocument()
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
      await user.click(screen.getByRole('button', { name: 'キャンセル' }))
      await openBackup(user)
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

  describe('AC40: the app name', () => {
    it('AC40: the list heading is ドライブスポット帳 with DRIVE SPOTS above it', async () => {
      await renderApp()

      const heading = screen.getByRole('heading', { level: 1, name: APP_NAME })
      expectFollows(screen.getByText('DRIVE SPOTS'), heading)
      expect(getListRegion()).toBeInTheDocument()
    })

    it('AC40: the old names 行きたい道ノート and DRIVE LIST appear on no screen', async () => {
      const { user } = await renderApp()
      const expectNoOldNames = () => {
        expect(document.body).not.toHaveTextContent('行きたい道ノート')
        expect(document.body).not.toHaveTextContent('DRIVE LIST')
      }

      expectNoOldNames()
      await openDetail(user, 'ヤビツ峠')
      expectNoOldNames()
      await backToList(user)
      await openAddForm(user)
      expectNoOldNames()
      await user.click(screen.getByRole('button', { name: 'キャンセル' }))
      await openBackup(user)
      expectNoOldNames()
    })
  })

  describe('AC31: the backup screen', () => {
    it('AC31: バックアップ on the list opens the backup screen with 一覧にもどる, ファイルに書き出す and ファイルから読み込む', async () => {
      const { user } = await renderApp()

      await user.click(getBackupButton())

      expect(await screen.findByRole('heading', { level: 1, name: 'バックアップ' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: BACK_LABEL })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: EXPORT_LABEL })).toBeInTheDocument()
      expect(screen.getByLabelText(IMPORT_LABEL)).toHaveAttribute('type', 'file')
      expect(screen.queryByRole('button', { name: WANT_TAB_NAME })).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(0)
    })

    it('AC31: 一覧にもどる returns to the list', async () => {
      const { user } = await renderApp()
      await openBackup(user)

      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(await screen.findByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: EXPORT_LABEL })).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(19)
    })

    it('AC31: the backup screen focuses its heading, and coming back focuses the list heading (even after visiting a detail before)', async () => {
      const { user } = await renderApp()
      await openDetail(user, '奥多摩')
      await backToList(user)

      await openBackup(user)

      expect(screen.getByRole('heading', { level: 1, name: 'バックアップ' })).toHaveFocus()

      await backFromBackup(user)

      expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toHaveFocus()
    })

    it('AC31: opening and leaving the backup screen writes nothing', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { user } = await renderApp()

      await openBackup(user)
      await backFromBackup(user)

      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('AC32/AC33: exporting', () => {
    it('AC32/AC33: ファイルに書き出す downloads drive-spots-2026-10-25.json holding the data on screen and records the time', async () => {
      fakeNow()
      const { blobs, downloads } = mockDownloads()
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      const savedRaw = window.localStorage.getItem(STORAGE_KEY)
      await openBackup(user)
      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*まだ書き出していません$/)

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

      expect(downloads).toEqual([{ fileName: 'drive-spots-2026-10-25.json', href: 'blob:drive-spots/1' }])
      expect(blobs).toHaveLength(1)
      expect(blobs[0].type).toContain('application/json')
      const exported: unknown = JSON.parse(await blobs[0].text())
      expect(exported).toEqual({
        app: 'drive-spots',
        backupVersion: 1,
        exportedAt: NOW.toISOString(),
        data: createSeedWithDone(1),
      })
      expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(NOW.toISOString())
      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月25日（今日）$/)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)
    })

    it('AC32: the file content is the 2-space indented JSON', async () => {
      fakeNow()
      const { blobs } = mockDownloads()
      const { user } = await renderApp()
      await openBackup(user)

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

      const content = await blobs[0].text()
      expect(content.trimEnd()).toBe(
        JSON.stringify(
          { app: 'drive-spots', backupVersion: 1, exportedAt: NOW.toISOString(), data: createSeedData() },
          null,
          2,
        ),
      )
    })

    it('AC33: shows the date of the last export when the backup screen opens later', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      window.localStorage.setItem(LAST_BACKUP_KEY, new Date(2026, 9, 20, 8, 0).toISOString())
      const { user } = await renderApp()

      await openBackup(user)

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月20日（5日前）$/)
    })

    it('AC33/AC38: after an export, the list button is just バックアップ again', async () => {
      fakeNow()
      mockDownloads()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user } = await renderApp()
      expect(getBackupButton()).toHaveAccessibleName(BACKUP_NEVER_LABEL)
      await openBackup(user)

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))
      await backFromBackup(user)

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
    })

    it('AC33: the recorded export survives a reload', async () => {
      fakeNow()
      mockDownloads()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user, unmount } = await renderApp()
      await openBackup(user)
      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))
      unmount()

      await renderApp()

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
    })

    // AC33: while saving is off (AC15) an export holds only what is on screen, not the saved data, so
    // it is not recorded. In every case below a write to LAST_BACKUP_KEY would succeed if it were
    // attempted, so an untouched key means recordBackup was not called.
    type SavingOffCase = {
      /** Puts the app into the state; returns the user for further steps. */
      reachState: () => Promise<User>
      notice: string
      /** What the export must contain: the data on screen. */
      expectedData: () => SpotsData
      /** What must still be under STORAGE_KEY afterwards. */
      expectedSavedRaw: string | null
    }

    const AC15_SAVING_OFF_CASES: [string, SavingOffCase][] = [
      [
        'AC14/AC15: corrupt data whose backup could not be written',
        {
          reachState: async () => {
            window.localStorage.setItem(STORAGE_KEY, '{broken')
            failSetItemFor(BACKUP_KEY)
            const { user } = await renderApp()
            await markDone(user, 'ヤビツ峠')
            return user
          },
          notice: NOT_PERSISTENT_NOTICE,
          expectedData: () => createSeedWithDone(1),
          expectedSavedRaw: '{broken',
        },
      ],
      [
        'AC15: a save that failed (quota exceeded)',
        {
          reachState: async () => {
            const { user } = await renderApp()
            failSetItemFor(STORAGE_KEY)
            await markDone(user, 'ヤビツ峠')
            return user
          },
          notice: NOT_PERSISTENT_NOTICE,
          expectedData: () => createSeedWithDone(1),
          expectedSavedRaw: null,
        },
      ],
    ]

    it.each(AC15_SAVING_OFF_CASES)(
      'AC32/AC33: with %s, the export still downloads the data on screen but is not recorded (never exported before)',
      async (_description, savingOffCase) => {
        fakeNow()
        const { blobs, downloads } = mockDownloads()
        const user = await savingOffCase.reachState()
        expect(await screen.findByText(savingOffCase.notice)).toBeInTheDocument()
        await openBackup(user)

        await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

        expect(downloads.map((download) => download.fileName)).toEqual(['drive-spots-2026-10-25.json'])
        const exported = JSON.parse(await blobs[0].text()) as { exportedAt: string; data: SpotsData }
        expect(exported.exportedAt).toBe(NOW.toISOString())
        expect(exported.data).toEqual(savingOffCase.expectedData())
        expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBeNull()
        expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*まだ書き出していません$/)
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savingOffCase.expectedSavedRaw)
      },
    )

    it.each(AC15_SAVING_OFF_CASES)(
      'AC33: with %s, an earlier recorded export stays as it was (date and stored value)',
      async (_description, savingOffCase) => {
        fakeNow()
        const earlierExport = new Date(2026, 9, 20, 8, 0).toISOString()
        window.localStorage.setItem(LAST_BACKUP_KEY, earlierExport)
        const { downloads } = mockDownloads()
        const user = await savingOffCase.reachState()
        expect(await screen.findByText(savingOffCase.notice)).toBeInTheDocument()
        await openBackup(user)

        await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

        expect(downloads).toHaveLength(1)
        expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(earlierExport)
        expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月20日（5日前）$/)
      },
    )

    // AC32: with data from a newer version (AC30) the screen data is not the saved data, so neither
    // exporting nor importing is offered: a file of seed data must not look like a real backup.
    const AC30_CASES: [string, () => Promise<User>][] = [
      [
        'found while loading',
        async () => {
          window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
          const { user } = await renderApp()
          return user
        },
      ],
      [
        'found right before a write',
        async () => {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
          const { user } = await renderApp()
          window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
          await markDone(user, 'ヤビツ峠')
          return user
        },
      ],
    ]

    it.each(AC30_CASES)(
      'AC32/AC30: with newer-version data (%s), the backup screen shows the AC30 notice and ファイルに書き出す is disabled and downloads nothing',
      async (_description, reachState) => {
        fakeNow()
        const { blobs, downloads } = mockDownloads()
        const user = await reachState()
        expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
        await openBackup(user)

        expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
        const exportButton = screen.getByRole('button', { name: EXPORT_LABEL })
        expect(exportButton).toBeDisabled()

        await user.click(exportButton)

        expect(downloads).toHaveLength(0)
        expect(blobs).toHaveLength(0)
        expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBeNull()
        expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*まだ書き出していません$/)
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      },
    )

    it.each(AC30_CASES)(
      'AC32/AC30: with newer-version data (%s), an earlier recorded export stays as it was and nothing is downloaded',
      async (_description, reachState) => {
        fakeNow()
        const earlierExport = new Date(2026, 9, 20, 8, 0).toISOString()
        window.localStorage.setItem(LAST_BACKUP_KEY, earlierExport)
        const { downloads } = mockDownloads()
        const user = await reachState()
        expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
        await openBackup(user)

        await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

        expect(downloads).toHaveLength(0)
        expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(earlierExport)
        expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月20日（5日前）$/)
      },
    )

    it.each(AC30_CASES)(
      'AC32/AC30: with newer-version data (%s), ファイルから読み込む is disabled and choosing a file changes nothing',
      async (_description, reachState) => {
        fakeNow()
        const user = await reachState()
        expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
        const countsBefore = [getWantTab().textContent, getDoneTab().textContent]
        await openBackup(user)

        const fileInput = screen.getByLabelText(IMPORT_LABEL)
        expect(fileInput).toBeDisabled()

        await chooseBackupFile(user, createJsonFile(createBackupFileText()))
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0))
        })

        expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: REPLACE_LABEL })).not.toBeInTheDocument()
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)

        await backFromBackup(user)

        expect([getWantTab().textContent, getDoneTab().textContent]).toEqual(countsBefore)
      },
    )

    it('AC32/AC30: 一覧にもどる still works on the backup screen with newer-version data', async () => {
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const { user } = await renderApp()
      await openBackup(user)

      await backFromBackup(user)

      expect(getNewerVersionNotice()).toBeInTheDocument()
    })

    it.each<[string, () => void]>([
      [
        'getItem and setItem throw',
        () => {
          vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
          vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwSecurityError)
        },
      ],
      [
        'reading window.localStorage throws',
        () => {
          vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)
        },
      ],
    ])(
      'AC32/AC33/AC15: when %s, the export still downloads the data on screen and is not recorded',
      async (_description, breakStorage) => {
        fakeNow()
        const { blobs, downloads } = mockDownloads()
        // Created first so it records every attempt; breakStorage may add a throwing implementation.
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        breakStorage()
        const { user } = await renderApp()
        expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
        await markDone(user, 'ヤビツ峠')
        await openBackup(user)

        await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

        expect(downloads.map((download) => download.fileName)).toEqual(['drive-spots-2026-10-25.json'])
        const exported = JSON.parse(await blobs[0].text()) as { data: SpotsData }
        expect(exported.data).toEqual(createSeedWithDone(1))
        expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*まだ書き出していません$/)
        expect(setItemSpy.mock.calls.map(([key]) => key)).not.toContain(LAST_BACKUP_KEY)
      },
    )

    it('AC33: an export made while saving works is recorded even after earlier exports were not (normal path again)', async () => {
      fakeNow()
      mockDownloads()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user } = await renderApp()
      await openBackup(user)

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

      expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(NOW.toISOString())
      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月25日（今日）$/)
    })

    it('AC32/AC21: exporting does not use the network', async () => {
      fakeNow()
      mockDownloads()
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)
      const { user } = await renderApp()
      await openBackup(user)

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

      expect(fetchSpy).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })

  describe('AC34-AC37: importing', () => {
    it('AC35/AC36: a valid file is previewed first; 置き換える then replaces the list and the saved data', async () => {
      fakeNow()
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      const savedRaw = window.localStorage.getItem(STORAGE_KEY)
      await openBackup(user)

      await chooseBackupFile(user, createJsonFile(createBackupFileText()))

      expect(await screen.findByText(FILE_PREVIEW_TITLE)).toBeInTheDocument()
      expect(screen.getByText('行きたい 3 / 行った 2')).toBeInTheDocument()
      expect(
        screen.getByText('いまのデータ（行きたい 18 / 行った 1）は、このファイルの中身に置き換わります。'),
      ).toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText('読み込みました（行きたい 3 / 行った 2）')).toBeInTheDocument()
      expect(readSavedData()).toEqual(IMPORT_FILE_DATA)

      await backFromBackup(user)

      expectTabCounts(3, 2)
      expect(getCardButtons().map((card) => card.textContent)).toEqual([
        expect.stringContaining('道志みち'),
        expect.stringContaining(HTML_NAME),
        expect.stringContaining('大観山'),
      ])
      expect(queryCard('ヤビツ峠')).not.toBeInTheDocument()
      await user.click(getDoneTab())
      expect(getCard('碓氷峠')).toBeInTheDocument()
      expect(getCard('首都高（都心環状線）')).toBeInTheDocument()
    })

    it('AC36/AC16: after the import, a new spot gets the nextId of the file', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)
      await importBackupFile(user)
      await backFromBackup(user)

      await addSpotThroughForm(user, { name: '一つ目' })

      const savedData = readSavedData()
      expect(savedData?.spots[0]).toMatchObject({ id: 50, name: '一つ目' })
      expect(savedData?.nextId).toBe(51)
    })

    it('AC36: the imported data is still there after a reload', async () => {
      fakeNow()
      const { user, unmount } = await renderApp()
      await openBackup(user)
      await importBackupFile(user)
      unmount()

      await renderApp()

      expectTabCounts(3, 2)
      expect(getCard('道志みち')).toBeInTheDocument()
    })

    it('AC36/AC22: the file replaces what another tab saved meanwhile', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)
      saveFromAnotherTab(createOtherTabData())

      await importBackupFile(user)

      expect(readSavedData()).toEqual(IMPORT_FILE_DATA)
    })

    it('AC37: names and memos that look like HTML are shown as text (no element is created)', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)
      await importBackupFile(user)
      await backFromBackup(user)

      expect(getCard(HTML_NAME)).toBeInTheDocument()
      expect(document.querySelector('img, script')).toBeNull()

      await openDetail(user, HTML_NAME)

      expect(screen.getByRole('heading', { level: 1, name: HTML_NAME })).toBeInTheDocument()
      expect(screen.getByText(HTML_MEMO)).toBeInTheDocument()
      expect(document.querySelector('img, script')).toBeNull()
    })

    it('AC35: やめる changes nothing', async () => {
      fakeNow()
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      const savedRaw = window.localStorage.getItem(STORAGE_KEY)
      await openBackup(user)
      await chooseBackupFile(user, createJsonFile(createBackupFileText()))
      await screen.findByText(FILE_PREVIEW_TITLE)

      await user.click(screen.getByRole('button', { name: CANCEL_IMPORT_LABEL }))

      expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)

      await backFromBackup(user)

      expectTabCounts(18, 1)
    })

    it('AC35: leaving the backup screen during the preview changes nothing, and the preview is gone when coming back', async () => {
      fakeNow()
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      const savedRaw = window.localStorage.getItem(STORAGE_KEY)
      await openBackup(user)
      await chooseBackupFile(user, createJsonFile(createBackupFileText()))
      await screen.findByText(FILE_PREVIEW_TITLE)

      await backFromBackup(user)

      expectTabCounts(18, 1)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)

      await openBackup(user)

      expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: REPLACE_LABEL })).not.toBeInTheDocument()
    })

    it.each<[string, string, string]>([
      ['a broken file', 'not json', INVALID_FILE_MESSAGE],
      ['the file of another app', createBackupFileText({ app: 'road-review' }), INVALID_FILE_MESSAGE],
      ['a file made by a newer version', createBackupFileText({ backupVersion: 2 }), NEWER_FILE_MESSAGE],
      [
        'a file whose nextId is Number.MAX_SAFE_INTEGER (AC16)',
        createBackupFileText({ data: { ...IMPORT_FILE_DATA, nextId: Number.MAX_SAFE_INTEGER } }),
        INVALID_FILE_MESSAGE,
      ],
    ])('AC34: %s shows its message and changes nothing', async (_description, text, message) => {
      fakeNow()
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      const savedRaw = window.localStorage.getItem(STORAGE_KEY)
      await openBackup(user)

      await chooseBackupFile(user, createJsonFile(text))

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: REPLACE_LABEL })).not.toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(savedRaw)

      await backFromBackup(user)

      expectTabCounts(18, 1)
    })

    it('AC34: a file larger than 1 MB shows its message and changes nothing', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)
      const text = createBackupFileText()
      const paddedText = text + ' '.repeat(1_000_001 - new TextEncoder().encode(text).length)

      await chooseBackupFile(user, createJsonFile(paddedText))

      expect(await screen.findByText('ファイルが大きすぎます（1MB まで）')).toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('AC36: after an import that was saved, the not-saved text is not shown', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)

      await importBackupFile(user)

      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()
      expect(readSavedData()).toEqual(IMPORT_FILE_DATA)
    })

    it.each<[string, () => void]>([
      [
        'getItem and setItem throw (storage unavailable from the start)',
        () => {
          vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
          vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwSecurityError)
        },
      ],
      ['reading window.localStorage throws', () => vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)],
    ])('AC36/AC15: when %s, 読み込みました is followed by the not-saved text', async (_description, breakStorage) => {
      fakeNow()
      breakStorage()
      const { user } = await renderApp()
      await openBackup(user)
      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()

      await importBackupFile(user)

      const doneText = screen.getByText('読み込みました（行きたい 3 / 行った 2）')
      const notSavedText = await screen.findByText(NOT_SAVED_AFTER_IMPORT_TEXT)
      expectFollows(doneText, notSavedText)
    })

    it('AC36/AC15: when the save of the import fails (setItem throws), the not-saved text appears and the list shows the import with the AC15 notice', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user } = await renderApp()
      expect(getNotice()).not.toBeInTheDocument()
      await openBackup(user)
      await chooseBackupFile(user, createJsonFile(createBackupFileText()))
      await screen.findByText(FILE_PREVIEW_TITLE)
      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()
      failSetItemFor(STORAGE_KEY)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      const doneText = await screen.findByText('読み込みました（行きたい 3 / 行った 2）')
      const notSavedText = await screen.findByText(NOT_SAVED_AFTER_IMPORT_TEXT)
      expectFollows(doneText, notSavedText)
      expect(readSavedData()).toEqual(createSeedData())

      await backFromBackup(user)

      expect(getNotice()).toBeInTheDocument()
      expectTabCounts(3, 2)
    })

    it('AC36/AC30: when a newer version saved meanwhile, 置き換える writes nothing and the backup screen switches to the AC30 notice', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user } = await renderApp()
      await openBackup(user)
      await chooseBackupFile(user, createJsonFile(createBackupFileText()))
      await screen.findByText(FILE_PREVIEW_TITLE)
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: EXPORT_LABEL })).toBeDisabled()
      expect(screen.getByLabelText(IMPORT_LABEL)).toBeDisabled()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC36/AC15: when localStorage cannot be used, the import changes the screen only', async () => {
      fakeNow()
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { user } = await renderApp()
      await openBackup(user)

      await importBackupFile(user)
      await backFromBackup(user)

      expectTabCounts(3, 2)
      expect(getNotice()).toBeInTheDocument()
      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('AC38: backup reminder on the list', () => {
    it('AC38: on the first run (nothing saved yet) the button is just バックアップ', async () => {
      fakeNow()
      await renderApp()

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
    })

    it('AC38: once something is saved and it was never exported, it becomes バックアップ（まだしていません）', async () => {
      fakeNow()
      const { user } = await renderApp()

      await markDone(user, 'ヤビツ峠')

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_NEVER_LABEL)
    })

    it('AC38: with saved data that was never exported, it is バックアップ（まだしていません） from the start', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))

      await renderApp()

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_NEVER_LABEL)
    })

    it.each<[string, string, Date]>([
      ['30 calendar days ago (Sep 25 23:00)', BACKUP_STALE_LABEL, new Date(2026, 8, 25, 23, 0)],
      ['45 days ago', BACKUP_STALE_LABEL, new Date(2026, 8, 10, 12, 0)],
      ['29 calendar days ago (Sep 26 00:00)', BACKUP_LABEL, new Date(2026, 8, 26, 0, 0)],
      ['earlier today', BACKUP_LABEL, new Date(2026, 9, 25, 7, 0)],
    ])('AC38: with the last export %s, the name is %s', async (_description, expectedName, lastBackupAt) => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      window.localStorage.setItem(LAST_BACKUP_KEY, lastBackupAt.toISOString())

      await renderApp()

      expect(getBackupButton()).toHaveAccessibleName(expectedName)
    })

    it('AC38: a last-backup value that is not a time counts as never exported', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      window.localStorage.setItem(LAST_BACKUP_KEY, 'not a date')

      await renderApp()

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_NEVER_LABEL)
    })

    it('AC38/AC15: when localStorage cannot be used, the button is just バックアップ', async () => {
      fakeNow()
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const { user } = await renderApp()

      await markDone(user, 'ヤビツ峠')

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
    })
  })

  describe('AC39: restore hint', () => {
    it('AC39: shows the hint on the first run and hides it once something is saved', async () => {
      const { user } = await renderApp()

      expect(getListRegion()).toHaveTextContent(RESTORE_HINT)

      await markDone(user, 'ヤビツ峠')

      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
    })

    it('AC39: no hint when valid data is saved', async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))

      await renderApp()

      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
    })

    it('AC39: shows the hint when the saved data was corrupt (there is no valid data yet)', async () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')

      await renderApp()

      expect(getListRegion()).toHaveTextContent(RESTORE_HINT)
    })

    it('AC39/AC15: no hint when localStorage cannot be used', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)

      await renderApp()

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
    })

    it('AC39/AC15: the hint goes away when a save fails (the cannot-save notice shows instead)', async () => {
      const { user } = await renderApp()
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      await markDone(user, 'ヤビツ峠')

      expect(await screen.findByText(NOT_PERSISTENT_NOTICE)).toBeInTheDocument()
      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
    })

    it('AC39/AC36: the hint goes away after importing a file', async () => {
      fakeNow()
      const { user } = await renderApp()
      await openBackup(user)

      await importBackupFile(user)
      await backFromBackup(user)

      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
    })
  })

  describe('AC30: data saved by a newer version', () => {
    it('AC30: shows the newer-version notice instead of the cannot-save notice, with the seed on screen, and writes nothing', async () => {
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      await renderApp()

      expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(NEWER_VERSION_NOTICE)
      expect(getNotice()).not.toBeInTheDocument()
      expect(getCardButtons()).toHaveLength(19)
      expectTabCounts(19, 0)
      expect(getListRegion()).not.toHaveTextContent(RESTORE_HINT)
      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC30: add, toggle, delete and memo editing change the screen only, import is not offered, and nothing is ever written', async () => {
      fakeNow()
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
      const { user } = await renderApp()

      await markDone(user, 'ヤビツ峠')
      expectTabCounts(18, 1)

      await addSpotThroughForm(user, { name: '大観山' })
      expectTabCounts(19, 1)
      expect(getCardButtons()[0]).toHaveTextContent('大観山')

      await openDetail(user, '奥多摩')
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))
      await screen.findByRole('button', { name: WANT_TAB_NAME })
      expect(queryCard('奥多摩')).not.toBeInTheDocument()

      await openDetail(user, '赤城山')
      await saveMemo(user, '新しいメモ')
      expect(screen.getByText('新しいメモ')).toBeInTheDocument()
      await backToList(user)

      await openBackup(user)
      expect(screen.getByLabelText(IMPORT_LABEL)).toBeDisabled()
      expect(screen.getByRole('button', { name: EXPORT_LABEL })).toBeDisabled()
      await backFromBackup(user)
      expectTabCounts(18, 1)

      expect(getNewerVersionNotice()).toBeInTheDocument()
      expect(getNotice()).not.toBeInTheDocument()
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(removeItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC30: when a newer version saves while this page is open, the next action writes nothing and the notice appears', async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSeedData()))
      const { user } = await renderApp()
      expect(getNewerVersionNotice()).not.toBeInTheDocument()
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      await markDone(user, 'ヤビツ峠')

      expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expect(getNotice()).not.toBeInTheDocument()
      expectTabCounts(18, 1)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()

      await markDone(user, '奥多摩')

      expect(setItemSpy).not.toHaveBeenCalled()
      expect(getNewerVersionNotice()).toBeInTheDocument()
    })

    it('AC30: a storage event with newer data shows the notice without any action, keeps the list and writes nothing', async () => {
      const { user } = await renderApp()
      await markDone(user, 'ヤビツ峠')
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      dispatchStorageEvent(STORAGE_KEY)

      expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expectTabCounts(18, 1)
      expect(setItemSpy).not.toHaveBeenCalled()

      await markDone(user, '奥多摩')

      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
    })

    it('AC30: a page restored by back/forward with newer data shows the notice and writes nothing', async () => {
      await renderApp()
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      dispatchPageShow(true)

      expect(await screen.findByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expectTabCounts(19, 0)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })
  })
})
