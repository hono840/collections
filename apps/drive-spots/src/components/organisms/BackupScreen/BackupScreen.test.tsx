import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaveNotice } from '@/components/organisms/SpotListScreen'
import type { Spot, SpotsData } from '@/lib/spots/types'
import { BackupScreen } from './BackupScreen'

// BackupScreen (spec AC31-AC37, docs/product/architecture.md, look and focus: docs/design/backup.md).
// The screen is driven through roles, labels and visible text only. The current time is faked
// (Date only, so user-event and Testing Library keep their real timers).
// Files are real File objects handed to userEvent.upload; jsdom supports both File#text() and
// FileReader, so the tests do not depend on which one the screen uses.

type User = ReturnType<typeof userEvent.setup>

const HEADING = 'バックアップ'
const BACK_LABEL = '一覧にもどる'
const EXPORT_LABEL = 'ファイルに書き出す'
const IMPORT_LABEL = 'ファイルから読み込む'
const REPLACE_LABEL = '置き換える'
const CANCEL_LABEL = 'やめる'
const LAST_BACKUP_LABEL = '最後に書き出した日'
const NEVER_EXPORTED_TEXT = 'まだ書き出していません'
const TOO_BIG_MESSAGE = 'ファイルが大きすぎます（1MB まで）'
const INVALID_MESSAGE = 'ドライブスポット帳のバックアップファイルではないか、壊れています'
const NEWER_MESSAGE = '新しい版のアプリで作られたファイルです。ページを再読み込みしてから、もう一度読み込んでください'
const HTML_NAME = '<img src=x onerror=alert(1)>'
const NEWER_VERSION_NOTICE =
  '新しい版のアプリで保存されたデータがあります。ページを再読み込みしてください（このままでは保存されません）'
const NOT_PERSISTENT_NOTICE = 'この端末では保存できません（再読み込みで消えます）'
const NOT_SAVED_AFTER_IMPORT_TEXT = 'この端末では保存できませんでした（再読み込みで消えます）'
const DONE_TEXT = '読み込みました（行きたい 3 / 行った 2）'

/** Local 2026-10-25 09:30: "today" for every test. */
const NOW = new Date(2026, 9, 25, 9, 30)
/** Local 2026-10-20 21:30: when the backup file was written. */
const FILE_EXPORTED_AT = new Date(2026, 9, 20, 21, 30)
const FILE_PREVIEW_TITLE = '2026年10月20日に書き出したファイル'

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

/** What the app shows now: 行きたい 4 / 行った 1. */
const CURRENT_SPOTS: Spot[] = [
  makeSpot({ id: 1, name: 'ヤビツ峠' }),
  makeSpot({ id: 2, name: '箱根ターンパイク', category: '絶景ロード' }),
  makeSpot({ id: 3, name: '奥多摩', region: '東京' }),
  makeSpot({ id: 4, name: '銚子ドーバーライン', region: '千葉', category: '海沿い' }),
  makeSpot({ id: 5, name: '伊豆スカイライン', region: '静岡', category: '絶景ロード', done: true }),
]

/** What the backup file holds: 行きたい 3 / 行った 2, its own nextId. */
const FILE_DATA: SpotsData = {
  version: 1,
  nextId: 50,
  spots: [
    makeSpot({ id: 41, name: '道志みち', region: '山梨・神奈川', distanceKm: '80', memo: '朝早く出る' }),
    makeSpot({ id: 40, name: HTML_NAME, memo: '<script>alert(1)</script>' }),
    makeSpot({ id: 33, name: '大観山', category: '絶景ロード' }),
    makeSpot({ id: 12, name: '碓氷峠', region: '群馬・長野', done: true }),
    makeSpot({ id: 7, name: '首都高（都心環状線）', region: '東京', category: '都市高速', done: true }),
  ],
}

function createBackupText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      app: 'drive-spots',
      backupVersion: 1,
      exportedAt: FILE_EXPORTED_AT.toISOString(),
      data: FILE_DATA,
      ...overrides,
    },
    null,
    2,
  )
}

function createJsonFile(text: string, fileName = 'drive-spots-2026-10-20.json'): File {
  return new File([text], fileName, { type: 'application/json' })
}

/** Pads JSON with trailing spaces (still valid JSON) to exactly `byteLength` bytes of UTF-8. */
function padToBytes(text: string, byteLength: number): string {
  const usedBytes = new TextEncoder().encode(text).length
  return text + ' '.repeat(byteLength - usedBytes)
}

type BackupProps = { spots?: Spot[]; lastBackupAt?: Date | null; saveNotice?: SaveNotice; focusOnMount?: boolean }

function renderBackup(props: BackupProps = {}) {
  const user = userEvent.setup()
  const callbacks = { onBack: vi.fn(), onExport: vi.fn(), onReplace: vi.fn() }
  const renderScreen = (screenProps: BackupProps) => (
    <BackupScreen
      spots={screenProps.spots ?? CURRENT_SPOTS}
      lastBackupAt={screenProps.lastBackupAt === undefined ? null : screenProps.lastBackupAt}
      saveNotice={screenProps.saveNotice ?? 'none'}
      focusOnMount={screenProps.focusOnMount}
      {...callbacks}
    />
  )
  const view = render(renderScreen(props))
  /** Re-renders with changed props, as the parent would (the callbacks stay the same). */
  const rerenderWith = (changedProps: BackupProps) => view.rerender(renderScreen({ ...props, ...changedProps }))
  return { user, ...callbacks, ...view, rerenderWith }
}

/** Lets pending file reads and the React updates after them finish. */
async function flushPendingWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/**
 * A valid-looking File whose content arrives only when `finishReading()` is called, so a test can
 * choose another file while this one is still being read. It controls File#text(), which this
 * jsdom supports (a FileReader-based screen would read it at once instead).
 */
function createSlowFile(text: string, fileName: string) {
  const file = createJsonFile(text, fileName)
  let finishReading: () => void = () => undefined
  const reading = new Promise<string>((resolve) => {
    finishReading = () => resolve(text)
  })
  Object.defineProperty(file, 'text', { value: () => reading })
  return {
    file,
    finishReading: async () => {
      finishReading()
      await flushPendingWork()
    },
  }
}

function getFileInput(): HTMLInputElement {
  const fileInput = screen.getByLabelText(IMPORT_LABEL)
  if (!(fileInput instanceof HTMLInputElement)) {
    throw new Error(`「${IMPORT_LABEL}」 is not an <input>`)
  }
  return fileInput
}

async function chooseFile(user: User, file: File) {
  await user.upload(getFileInput(), file)
}

/** Chooses a valid backup file and waits for the preview (AC35). */
async function chooseValidFile(user: User) {
  await chooseFile(user, createJsonFile(createBackupText()))
  await screen.findByText(FILE_PREVIEW_TITLE)
}

/** The 最後に書き出した日 box: its label and its value share one wrapper element. */
function getLastBackupTile(): HTMLElement {
  const tile = screen.getByText(LAST_BACKUP_LABEL).parentElement
  if (tile === null) {
    throw new Error(`No box for 「${LAST_BACKUP_LABEL}」`)
  }
  return tile
}

function queryReplaceButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: REPLACE_LABEL })
}

function expectNoPreview() {
  expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
  expect(queryReplaceButton()).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: CANCEL_LABEL })).not.toBeInTheDocument()
  expect(document.body).not.toHaveTextContent('このファイルの中身に置き換わります')
}

/** jsdom has no layout and no Element#scrollIntoView; the design scrolls the preview into view. */
function ensureScrollIntoView() {
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => undefined
  }
}

beforeEach(() => {
  ensureScrollIntoView()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BackupScreen', () => {
  describe('layout (AC31)', () => {
    it('AC31: has 一覧にもどる, ファイルに書き出す and ファイルから読み込む under the heading バックアップ', () => {
      renderBackup()

      expect(screen.getByRole('heading', { level: 1, name: HEADING })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: BACK_LABEL })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: EXPORT_LABEL })).toBeInTheDocument()
      expect(getFileInput()).toBeInTheDocument()
    })

    it('AC18/AC31: the buttons are real <button>s and ファイルから読み込む is a labelled <input type="file">', () => {
      renderBackup()

      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeInstanceOf(HTMLButtonElement)
      }
      expect(getFileInput()).toHaveAttribute('type', 'file')
    })

    it('AC35: shows no preview, no error and no 置き換える before a file is chosen', () => {
      renderBackup()

      expectNoPreview()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.body).not.toHaveTextContent(INVALID_MESSAGE)
    })
  })

  describe('最後に書き出した日 (AC33)', () => {
    it('AC33: shows まだ書き出していません when it was never exported', () => {
      renderBackup({ lastBackupAt: null })

      expect(getLastBackupTile()).toHaveTextContent(new RegExp(`^${LAST_BACKUP_LABEL}\\s*${NEVER_EXPORTED_TEXT}$`))
    })

    it('AC33: shows 2026年10月25日（今日） for an export earlier today', () => {
      renderBackup({ lastBackupAt: new Date(2026, 9, 25, 0, 10) })

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月25日（今日）$/)
    })

    it('AC33: shows 2026年10月20日（5日前） for an export 5 calendar days ago', () => {
      renderBackup({ lastBackupAt: new Date(2026, 9, 20, 23, 50) })

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月20日（5日前）$/)
    })

    it('AC33: counts calendar days (yesterday late at night is 1日前)', () => {
      renderBackup({ lastBackupAt: new Date(2026, 9, 24, 23, 59) })

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月24日（1日前）$/)
    })

    it('AC33: follows a new lastBackupAt (after an export)', () => {
      const { rerender, onBack, onExport, onReplace } = renderBackup({ lastBackupAt: null })

      rerender(
        <BackupScreen
          spots={CURRENT_SPOTS}
          lastBackupAt={NOW}
          saveNotice="none"
          onBack={onBack}
          onExport={onExport}
          onReplace={onReplace}
        />,
      )

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月25日（今日）$/)
    })
  })

  describe('buttons (AC31, AC32)', () => {
    it('AC32: ファイルに書き出す calls onExport once', async () => {
      const { user, onExport, onBack, onReplace } = renderBackup()

      await user.click(screen.getByRole('button', { name: EXPORT_LABEL }))

      expect(onExport).toHaveBeenCalledTimes(1)
      expect(onBack).not.toHaveBeenCalled()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC31: 一覧にもどる calls onBack once', async () => {
      const { user, onBack, onExport } = renderBackup()

      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(onExport).not.toHaveBeenCalled()
    })
  })

  describe('checking the chosen file (AC34)', () => {
    it('AC34: a file of 1,000,001 bytes is too big: the message is shown and nothing is replaced', async () => {
      const { user, onReplace } = renderBackup()
      const text = padToBytes(createBackupText(), 1_000_001)

      await chooseFile(user, createJsonFile(text))

      expect(await screen.findByText(TOO_BIG_MESSAGE)).toBeInTheDocument()
      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC34: a file of exactly 1,000,000 bytes is still read', async () => {
      const { user } = renderBackup()
      const text = padToBytes(createBackupText(), 1_000_000)

      await chooseFile(user, createJsonFile(text))

      expect(await screen.findByText(FILE_PREVIEW_TITLE)).toBeInTheDocument()
      expect(screen.queryByText(TOO_BIG_MESSAGE)).not.toBeInTheDocument()
    })

    it('AC34: the size is checked from the file itself (a 5 MB file is refused without trusting its content)', async () => {
      const { user, onReplace } = renderBackup()
      const file = createJsonFile(createBackupText())
      Object.defineProperty(file, 'size', { value: 5_000_000 })

      await chooseFile(user, file)

      expect(await screen.findByText(TOO_BIG_MESSAGE)).toBeInTheDocument()
      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it.each<[string, string]>([
      ['an empty file', ''],
      ['text that is not JSON', 'ドライブスポット帳'],
      ['the JSON of another app', createBackupText({ app: 'road-review' })],
      ['a file without exportedAt', JSON.stringify({ app: 'drive-spots', backupVersion: 1, data: FILE_DATA })],
      ["backupVersion as the string '1'", createBackupText({ backupVersion: '1' })],
      ['backupVersion 1.5', createBackupText({ backupVersion: 1.5 })],
      [
        'data with an unknown category (as strict as AC14)',
        createBackupText({ data: { ...FILE_DATA, spots: [{ ...FILE_DATA.spots[0], category: '林道' }] } }),
      ],
      ['data with duplicate ids', createBackupText({ data: { ...FILE_DATA, spots: [FILE_DATA.spots[0], FILE_DATA.spots[0]] } })],
      ['the saved data alone (not a backup file)', JSON.stringify(FILE_DATA)],
      ['data with nextId Number.MAX_SAFE_INTEGER (AC16)', createBackupText({ data: { ...FILE_DATA, nextId: Number.MAX_SAFE_INTEGER } })],
      ['data with nextId 1,000,000,001 (AC16)', createBackupText({ data: { ...FILE_DATA, nextId: 1_000_000_001 } })],
    ])('AC34: %s is refused as not a backup file or broken', async (_description, text) => {
      const { user, onReplace } = renderBackup()

      await chooseFile(user, createJsonFile(text))

      expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument()
      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it.each<[string, string]>([
      ['backupVersion 2', createBackupText({ backupVersion: 2 })],
      ['backupVersion 3 with data in an unknown shape', createBackupText({ backupVersion: 3, data: { places: [] } })],
      ['data.version 2', createBackupText({ data: { ...FILE_DATA, version: 2 } })],
    ])('AC34: a file with %s is refused as made by a newer version', async (_description, text) => {
      const { user, onReplace } = renderBackup()

      await chooseFile(user, createJsonFile(text))

      expect(await screen.findByText(NEWER_MESSAGE)).toBeInTheDocument()
      expect(screen.queryByText(INVALID_MESSAGE)).not.toBeInTheDocument()
      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC34: the error is announced (role alert)', async () => {
      const { user } = renderBackup()

      await chooseFile(user, createJsonFile('not json'))

      expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_MESSAGE)
    })

    it('AC34/AC35: choosing a valid file after an error shows the preview and removes the error', async () => {
      const { user } = renderBackup()
      await chooseFile(user, createJsonFile('not json'))
      await screen.findByText(INVALID_MESSAGE)

      await chooseValidFile(user)

      expect(screen.queryByText(INVALID_MESSAGE)).not.toBeInTheDocument()
      expect(queryReplaceButton()).toBeInTheDocument()
    })

    it('AC34: choosing a broken file after a preview removes the preview', async () => {
      const { user, onReplace } = renderBackup()
      await chooseValidFile(user)

      await chooseFile(user, createJsonFile(createBackupText({ app: 'road-review' })))

      expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument()
      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC34: closing the file chooser without a file shows nothing', async () => {
      const { user, onReplace } = renderBackup()

      await user.upload(getFileInput(), [])

      expectNoPreview()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC37/AC21: reading the file does not use the network', async () => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)
      const { user } = renderBackup()

      await chooseValidFile(user)

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('preview (AC35)', () => {
    it('AC35: shows the export date, the counts of the file and of the current data, 置き換える and やめる', async () => {
      const { user, onReplace } = renderBackup()

      await chooseValidFile(user)

      expect(screen.getByText(FILE_PREVIEW_TITLE)).toBeInTheDocument()
      expect(screen.getByText('行きたい 3 / 行った 2')).toBeInTheDocument()
      expect(
        screen.getByText('いまのデータ（行きたい 4 / 行った 1）は、このファイルの中身に置き換わります。'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: REPLACE_LABEL })).toBeInstanceOf(HTMLButtonElement)
      expect(screen.getByRole('button', { name: CANCEL_LABEL })).toBeInstanceOf(HTMLButtonElement)
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC35: the export date is the device calendar date of exportedAt', async () => {
      const { user } = renderBackup()
      const lateEvening = new Date(2026, 9, 3, 23, 45)

      await chooseFile(user, createJsonFile(createBackupText({ exportedAt: lateEvening.toISOString() })))

      expect(await screen.findByText('2026年10月3日に書き出したファイル')).toBeInTheDocument()
    })

    it('AC35: counts an empty file and empty current data as 0', async () => {
      const { user } = renderBackup({ spots: [] })

      await chooseFile(user, createJsonFile(createBackupText({ data: { version: 1, nextId: 20, spots: [] } })))

      expect(await screen.findByText('行きたい 0 / 行った 0')).toBeInTheDocument()
      expect(screen.getByText('いまのデータ（行きたい 0 / 行った 0）は、このファイルの中身に置き換わります。')).toBeInTheDocument()
    })

    it('AC35: やめる closes the preview without replacing anything, and a file can be chosen again', async () => {
      const { user, onReplace } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: CANCEL_LABEL }))

      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()

      await chooseValidFile(user)

      expect(queryReplaceButton()).toBeInTheDocument()
    })

    it('AC35: leaving the screen (unmount) discards the preview without replacing anything', async () => {
      const { user, onReplace, unmount } = renderBackup()
      await chooseValidFile(user)

      unmount()
      renderBackup()

      expectNoPreview()
      expect(onReplace).not.toHaveBeenCalled()
    })
  })

  describe('replacing (AC36)', () => {
    it('AC36: 置き換える calls onReplace once with the data of the file (nextId included)', async () => {
      const { user, onReplace } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(onReplace).toHaveBeenCalledTimes(1)
      expect(onReplace).toHaveBeenCalledWith(FILE_DATA)
    })

    it('AC36: then shows 読み込みました with the counts of the file, and 置き換える is gone', async () => {
      const { user } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText('読み込みました（行きたい 3 / 行った 2）')).toBeInTheDocument()
      expect(queryReplaceButton()).not.toBeInTheDocument()
    })

    it('AC36: does not call onBack or onExport', async () => {
      const { user, onBack, onExport } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(onBack).not.toHaveBeenCalled()
      expect(onExport).not.toHaveBeenCalled()
    })
  })

  describe('file content is plain text (AC37)', () => {
    it('AC37: HTML in spot names and in the file name is never turned into elements', async () => {
      const { user, container } = renderBackup()

      await chooseFile(user, createJsonFile(createBackupText(), `${HTML_NAME}.json`))
      await screen.findByText(FILE_PREVIEW_TITLE)

      expect(container.querySelector('img, script')).toBeNull()

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))
      await screen.findByText('読み込みました（行きたい 3 / 行った 2）')

      expect(document.querySelector('img, script')).toBeNull()
    })

    it('AC37: a file whose content is HTML is refused and stays text', async () => {
      const { user, container } = renderBackup()

      await chooseFile(user, createJsonFile(`${HTML_NAME}<script>alert(1)</script>`))

      expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument()
      expect(container.querySelector('img, script')).toBeNull()
    })
  })

  describe('AC16: the largest nextId', () => {
    it('AC16/AC35: a file with nextId exactly 1,000,000,000 is still previewed and replaced as it is', async () => {
      const { user, onReplace } = renderBackup()
      const largestData: SpotsData = { ...FILE_DATA, nextId: 1_000_000_000 }

      await chooseFile(user, createJsonFile(createBackupText({ data: largestData })))
      await screen.findByText(FILE_PREVIEW_TITLE)
      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(onReplace).toHaveBeenCalledWith(largestData)
    })
  })

  describe('saveNotice (AC30, AC32, AC36)', () => {
    it("AC32/AC30: with saveNotice 'newer-version', shows the AC30 notice", () => {
      renderBackup({ saveNotice: 'newer-version' })

      expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
    })

    it("AC32/AC30: with saveNotice 'newer-version', ファイルに書き出す is disabled and pressing it does not call onExport", async () => {
      const { user, onExport } = renderBackup({ saveNotice: 'newer-version' })

      const exportButton = screen.getByRole('button', { name: EXPORT_LABEL })
      expect(exportButton).toBeDisabled()
      await user.click(exportButton)

      expect(onExport).not.toHaveBeenCalled()
    })

    it("AC32/AC30: with saveNotice 'newer-version', ファイルから読み込む is disabled and a chosen file shows nothing", async () => {
      const { user, onReplace } = renderBackup({ saveNotice: 'newer-version' })

      expect(getFileInput()).toBeDisabled()
      await chooseFile(user, createJsonFile(createBackupText()))
      await flushPendingWork()

      expectNoPreview()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it("AC32/AC30: with saveNotice 'newer-version', 一覧にもどる still works and the last export date is still shown", async () => {
      const { user, onBack } = renderBackup({ saveNotice: 'newer-version', lastBackupAt: new Date(2026, 9, 20, 8, 0) })

      expect(getLastBackupTile()).toHaveTextContent(/^最後に書き出した日\s*2026年10月20日（5日前）$/)
      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it.each<SaveNotice>(['none', 'unavailable'])(
      "AC32/AC15: with saveNotice '%s', exporting and importing work and the AC30 notice is not shown",
      async (saveNotice) => {
        const { user, onExport } = renderBackup({ saveNotice })

        expect(document.body).not.toHaveTextContent(NEWER_VERSION_NOTICE)
        const exportButton = screen.getByRole('button', { name: EXPORT_LABEL })
        expect(exportButton).toBeEnabled()
        await user.click(exportButton)
        expect(onExport).toHaveBeenCalledTimes(1)

        expect(getFileInput()).toBeEnabled()
        await chooseValidFile(user)
        expect(queryReplaceButton()).toBeInTheDocument()
      },
    )

    it("AC32/AC30: switching to 'newer-version' while the screen is open shows the notice and disables both", () => {
      const { rerenderWith } = renderBackup({ saveNotice: 'none' })

      rerenderWith({ saveNotice: 'newer-version' })

      expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: EXPORT_LABEL })).toBeDisabled()
      expect(getFileInput()).toBeDisabled()
    })

    it('AC36: after 置き換える with saving working, the not-saved text is not shown', async () => {
      const { user } = renderBackup({ saveNotice: 'none' })
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText(DONE_TEXT)).toBeInTheDocument()
      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()
    })

    it("AC36/AC15: when the replace could not be saved (saveNotice becomes 'unavailable'), shows the not-saved text below 読み込みました", async () => {
      const { user, rerenderWith } = renderBackup({ saveNotice: 'none' })
      await chooseValidFile(user)
      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))
      await screen.findByText(DONE_TEXT)

      rerenderWith({ saveNotice: 'unavailable' })

      const doneText = screen.getByText(DONE_TEXT)
      const notSavedText = screen.getByText(NOT_SAVED_AFTER_IMPORT_TEXT)
      expect(doneText.compareDocumentPosition(notSavedText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it("AC36/AC15: with saveNotice 'unavailable' from the start, the not-saved text appears only after 置き換える", async () => {
      const { user } = renderBackup({ saveNotice: 'unavailable' })
      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()
      await chooseValidFile(user)
      expect(screen.queryByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText(DONE_TEXT)).toBeInTheDocument()
      expect(screen.getByText(NOT_SAVED_AFTER_IMPORT_TEXT)).toBeInTheDocument()
    })

    it("AC36: the not-saved text is a separate line, so 読み込みました keeps its exact text", async () => {
      const { user } = renderBackup({ saveNotice: 'unavailable' })
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(screen.getByText(DONE_TEXT)).not.toHaveTextContent(NOT_SAVED_AFTER_IMPORT_TEXT)
      expect(screen.getByText(NOT_SAVED_AFTER_IMPORT_TEXT)).not.toHaveTextContent(DONE_TEXT)
    })

    it("AC36/AC15: the AC15 notice text itself is not what is shown after an import (the wording differs)", async () => {
      const { user } = renderBackup({ saveNotice: 'unavailable' })
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))
      await screen.findByText(NOT_SAVED_AFTER_IMPORT_TEXT)

      expect(screen.queryByText(NOT_PERSISTENT_NOTICE)).not.toBeInTheDocument()
    })
  })

  describe('a file chosen while another is still being read (stale read)', () => {
    /** File B: written on Oct 22 with 行きたい 1 / 行った 0. */
    const FILE_B_DATA: SpotsData = { version: 1, nextId: 60, spots: [makeSpot({ id: 59, name: '道志みち' })] }
    const FILE_B_TITLE = '2026年10月22日に書き出したファイル'
    const fileBText = () => createBackupText({ exportedAt: new Date(2026, 9, 22, 12, 0).toISOString(), data: FILE_B_DATA })

    it('AC35: when A finishes after B, only B is previewed and 置き換える uses B', async () => {
      const { user, onReplace } = renderBackup()
      const slowFileA = createSlowFile(createBackupText(), 'a.json')

      await chooseFile(user, slowFileA.file)
      await chooseFile(user, createJsonFile(fileBText(), 'b.json'))
      expect(await screen.findByText(FILE_B_TITLE)).toBeInTheDocument()

      await slowFileA.finishReading()

      expect(screen.getByText(FILE_B_TITLE)).toBeInTheDocument()
      expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
      expect(screen.getByText('行きたい 1 / 行った 0')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(onReplace).toHaveBeenCalledTimes(1)
      expect(onReplace).toHaveBeenCalledWith(FILE_B_DATA)
    })

    it('AC35: when A finishes while B is still being read, A shows nothing; then B is previewed', async () => {
      const { user } = renderBackup()
      const slowFileA = createSlowFile(createBackupText(), 'a.json')
      const slowFileB = createSlowFile(fileBText(), 'b.json')

      await chooseFile(user, slowFileA.file)
      await chooseFile(user, slowFileB.file)
      await slowFileA.finishReading()

      expectNoPreview()

      await slowFileB.finishReading()

      expect(screen.getByText(FILE_B_TITLE)).toBeInTheDocument()
      expect(screen.queryByText(FILE_PREVIEW_TITLE)).not.toBeInTheDocument()
    })

    it('AC34/AC35: when B is broken, the late result of a valid A does not replace B’s error with a preview', async () => {
      const { user, onReplace } = renderBackup()
      const slowFileA = createSlowFile(createBackupText(), 'a.json')

      await chooseFile(user, slowFileA.file)
      await chooseFile(user, createJsonFile('not json', 'b.json'))
      expect(await screen.findByText(INVALID_MESSAGE)).toBeInTheDocument()

      await slowFileA.finishReading()

      expectNoPreview()
      expect(screen.getByText(INVALID_MESSAGE)).toBeInTheDocument()
      expect(onReplace).not.toHaveBeenCalled()
    })

    it('AC34/AC35: when B is too big, the late result of a valid A does not replace B’s error with a preview', async () => {
      const { user } = renderBackup()
      const slowFileA = createSlowFile(createBackupText(), 'a.json')
      const tooBigFileB = createJsonFile(padToBytes(fileBText(), 1_000_001), 'b.json')

      await chooseFile(user, slowFileA.file)
      await chooseFile(user, tooBigFileB)
      expect(await screen.findByText(TOO_BIG_MESSAGE)).toBeInTheDocument()

      await slowFileA.finishReading()

      expectNoPreview()
      expect(screen.getByText(TOO_BIG_MESSAGE)).toBeInTheDocument()
    })

    it('AC35: a preview of an earlier file is not left on screen while the next file is being read', async () => {
      const { user, onReplace } = renderBackup()
      await chooseValidFile(user)
      const slowFileB = createSlowFile(fileBText(), 'b.json')

      await chooseFile(user, slowFileB.file)

      expect(queryReplaceButton()).not.toBeInTheDocument()

      await slowFileB.finishReading()

      expect(screen.getByText(FILE_B_TITLE)).toBeInTheDocument()
      expect(onReplace).not.toHaveBeenCalled()
    })
  })

  describe('focus (docs/design/backup.md)', () => {
    it('does not move focus when focusOnMount is false', () => {
      renderBackup({ focusOnMount: false })

      expect(document.body).toHaveFocus()
    })

    it('with focusOnMount, focuses the heading バックアップ', () => {
      renderBackup({ focusOnMount: true })

      expect(screen.getByRole('heading', { level: 1, name: HEADING })).toHaveFocus()
    })

    it('after a valid file, focuses the preview title (not 置き換える)', async () => {
      const { user } = renderBackup()

      await chooseValidFile(user)

      expect(screen.getByText(FILE_PREVIEW_TITLE)).toHaveFocus()
      expect(queryReplaceButton()).not.toHaveFocus()
    })

    it('after やめる, focuses the file input', async () => {
      const { user } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: CANCEL_LABEL }))

      expect(getFileInput()).toHaveFocus()
    })

    it('after 置き換える, focuses the 読み込みました text', async () => {
      const { user } = renderBackup()
      await chooseValidFile(user)

      await user.click(screen.getByRole('button', { name: REPLACE_LABEL }))

      expect(await screen.findByText('読み込みました（行きたい 3 / 行った 2）')).toHaveFocus()
    })
  })
})
