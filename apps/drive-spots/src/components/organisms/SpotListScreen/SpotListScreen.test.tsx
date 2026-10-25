import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryFilter, Spot, Tab } from '@/lib/spots/types'
import { SpotListScreen } from './SpotListScreen'

const APP_NAME = 'ドライブスポット帳'
const NOT_PERSISTENT_NOTICE = 'この端末では保存できません（再読み込みで消えます）'
const NEWER_VERSION_NOTICE =
  '新しい版のアプリで保存されたデータがあります。ページを再読み込みしてください（このままでは保存されません）'
const RESTORE_HINT = '前に使っていたデータは「バックアップ」から読み込めます'
const BACKUP_LABEL = 'バックアップ'
const BACKUP_NEVER_LABEL = 'バックアップ（まだしていません）'
const BACKUP_STALE_LABEL = 'バックアップ（30日以上していません）'
const BACKUP_BUTTON_NAME = /^バックアップ/
const EMPTY_TITLE = 'まだありません'
const EMPTY_DESCRIPTION = '行ったスポットは、詳細画面の「行った！」ボタンでここに移ります'
const WANT_TAB_NAME = /^行きたい\s*\d+$/
const DONE_TAB_NAME = /^行った\s*\d+$/

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

const SAMPLE_SPOTS: Spot[] = [
  makeSpot({ id: 1, name: 'ヤビツ峠' }),
  makeSpot({ id: 2, name: '箱根ターンパイク', category: '絶景ロード', done: true }),
  makeSpot({ id: 3, name: '奥多摩', region: '東京', done: true }),
  makeSpot({ id: 4, name: '銚子ドーバーライン', region: '千葉', category: '海沿い' }),
  makeSpot({ id: 5, name: '伊豆スカイライン', region: '静岡', category: '絶景ロード' }),
]

type SaveNotice = 'none' | 'unavailable' | 'newer-version'
type BackupReminder = 'none' | 'never' | 'stale'

type ListProps = {
  spots?: Spot[]
  tab?: Tab
  category?: CategoryFilter
  saveNotice?: SaveNotice
  backupReminder?: BackupReminder
  showRestoreHint?: boolean
  focusOnMount?: boolean
  focusSpotId?: number | null
}

function renderList(props: ListProps = {}) {
  const callbacks = {
    onTabChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onOpenSpot: vi.fn(),
    onAddSpot: vi.fn(),
    onOpenBackup: vi.fn(),
  }
  const view = render(
    <SpotListScreen
      spots={props.spots ?? SAMPLE_SPOTS}
      tab={props.tab ?? 'want'}
      category={props.category ?? 'すべて'}
      saveNotice={props.saveNotice ?? 'none'}
      backupReminder={props.backupReminder ?? 'none'}
      showRestoreHint={props.showRestoreHint ?? false}
      focusOnMount={props.focusOnMount}
      focusSpotId={props.focusSpotId}
      {...callbacks}
    />,
  )
  return { ...callbacks, ...view }
}

function getHeading(): HTMLElement {
  return screen.getByRole('heading', { level: 1, name: APP_NAME })
}

function getRegion(): HTMLElement {
  return screen.getByRole('region', { name: APP_NAME })
}

function getBackupButton(): HTMLElement {
  return screen.getByRole('button', { name: BACKUP_BUTTON_NAME })
}

/** Spot cards are the buttons inside the list. */
function getCards(): HTMLElement[] {
  const list = screen.queryByRole('list')
  return list === null ? [] : within(list).queryAllByRole('button')
}

function getCard(spotName: string): HTMLElement {
  const card = screen.getByText(spotName).closest('button')
  if (card === null) {
    throw new Error(`No card for ${spotName}`)
  }
  return card
}

function expectFollows(earlierElement: Element, laterElement: Element) {
  expect(earlierElement.compareDocumentPosition(laterElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

describe('SpotListScreen', () => {
  describe('layout', () => {
    it('AC1/AC40: is a region named by its heading ドライブスポット帳', () => {
      renderList()

      expect(getHeading()).toBeInTheDocument()
      expect(getRegion()).toBeInTheDocument()
    })

    it('AC40: the small English line above the heading is DRIVE SPOTS', () => {
      renderList()

      const eyebrow = screen.getByText('DRIVE SPOTS')
      expectFollows(eyebrow, getHeading())
    })

    it('AC40: the old names 行きたい道ノート and DRIVE LIST are gone', () => {
      renderList()

      expect(getRegion()).not.toHaveTextContent('行きたい道ノート')
      expect(getRegion()).not.toHaveTextContent('DRIVE LIST')
    })

    it('AC2/AC3: shows the tabs, then the category chips, then the cards', () => {
      renderList()

      const tabGroup = screen.getByRole('group', { name: '一覧の切り替え' })
      const chipGroup = screen.getByRole('group', { name: '種類で絞り込み' })
      expectFollows(getHeading(), tabGroup)
      expectFollows(tabGroup, chipGroup)
      expectFollows(chipGroup, screen.getByRole('list'))
    })

    it('AC3: the chips are すべて / 峠 / 絶景ロード / 海沿い / サーキット / 都市高速 in order', () => {
      renderList()

      const chips = within(screen.getByRole('group', { name: '種類で絞り込み' })).getAllByRole('button')
      expect(chips.map((chip) => chip.textContent)).toEqual([
        'すべて',
        '峠',
        '絶景ロード',
        '海沿い',
        'サーキット',
        '都市高速',
      ])
    })
  })

  describe('tabs and filtering', () => {
    it('AC2: the tab counts are totals over all spots, even with a category filter', () => {
      renderList({ category: '海沿い' })

      expect(screen.getByRole('button', { name: WANT_TAB_NAME })).toHaveAccessibleName(/^行きたい\s*3$/)
      expect(screen.getByRole('button', { name: DONE_TAB_NAME })).toHaveAccessibleName(/^行った\s*2$/)
    })

    it.each([
      ['want', '行きたい', 'true', 'false'],
      ['done', '行った', 'false', 'true'],
    ] as const)('AC2: with tab %s, the %s tab is pressed', (tab, _label, wantPressed, donePressed) => {
      renderList({ tab })

      expect(screen.getByRole('button', { name: WANT_TAB_NAME })).toHaveAttribute('aria-pressed', wantPressed)
      expect(screen.getByRole('button', { name: DONE_TAB_NAME })).toHaveAttribute('aria-pressed', donePressed)
    })

    it('AC3: the current category chip is pressed and the others are not', () => {
      renderList({ category: '絶景ロード' })

      const chips = within(screen.getByRole('group', { name: '種類で絞り込み' })).getAllByRole('button')
      for (const chip of chips) {
        expect(chip).toHaveAttribute('aria-pressed', chip.textContent === '絶景ロード' ? 'true' : 'false')
      }
    })

    it('AC2: 行きたい shows only spots that are not done, in list order', () => {
      renderList({ tab: 'want' })

      expect(getCards().map((card) => card.textContent)).toEqual([
        '峠ヤビツ峠神奈川・峠',
        '海銚子ドーバーライン千葉・海沿い',
        '景伊豆スカイライン静岡・絶景ロード',
      ])
    })

    it('AC2: 行った shows only done spots', () => {
      renderList({ tab: 'done' })

      expect(getCards()).toHaveLength(2)
      expect(getCard('箱根ターンパイク')).toBeInTheDocument()
      expect(getCard('奥多摩')).toBeInTheDocument()
    })

    it('AC3: combines the tab and the category with AND', () => {
      renderList({ tab: 'done', category: '峠' })

      expect(getCards()).toHaveLength(1)
      expect(getCard('奥多摩')).toBeInTheDocument()
    })

    it('AC4: the cards are list items', () => {
      renderList()

      const list = screen.getByRole('list')
      expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    })

    it('AC4: a done card carries the check icon (one more icon than a 行きたい card)', () => {
      const { unmount } = renderList({ tab: 'want' })
      const wantCardIconCount = getCard('ヤビツ峠').querySelectorAll('svg').length
      unmount()

      renderList({ tab: 'done' })
      const doneCardIconCount = getCard('奥多摩').querySelectorAll('svg').length

      expect(doneCardIconCount).toBe(wantCardIconCount + 1)
    })
  })

  describe('callbacks', () => {
    it("AC2: pressing the 行った tab calls onTabChange('done')", async () => {
      const user = userEvent.setup()
      const { onTabChange } = renderList()

      await user.click(screen.getByRole('button', { name: DONE_TAB_NAME }))

      expect(onTabChange).toHaveBeenCalledWith('done')
    })

    it('AC3: pressing a chip calls onCategoryChange with that category', async () => {
      const user = userEvent.setup()
      const { onCategoryChange } = renderList()

      await user.click(screen.getByRole('button', { name: 'サーキット' }))

      expect(onCategoryChange).toHaveBeenCalledWith('サーキット')
    })

    it('AC4: pressing a card calls onOpenSpot with its id', async () => {
      const user = userEvent.setup()
      const { onOpenSpot } = renderList()

      await user.click(getCard('銚子ドーバーライン'))

      expect(onOpenSpot).toHaveBeenCalledTimes(1)
      expect(onOpenSpot).toHaveBeenCalledWith(4)
    })

    it('AC9: the add button is named スポットを追加 and calls onAddSpot', async () => {
      const user = userEvent.setup()
      const { onAddSpot } = renderList()

      const addButton = screen.getByRole('button', { name: 'スポットを追加' })
      expect(addButton).toBeInstanceOf(HTMLButtonElement)
      await user.click(addButton)

      expect(onAddSpot).toHaveBeenCalledTimes(1)
    })

    it('AC9: the add button is there even when the list is empty', () => {
      renderList({ spots: [] })

      expect(screen.getByRole('button', { name: 'スポットを追加' })).toBeInTheDocument()
    })
  })

  describe('empty state (AC5)', () => {
    it('AC5: shows まだありません and the description when no spot matches, and no list', () => {
      renderList({ tab: 'done', category: '海沿い' })

      expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
      expect(getRegion()).toHaveTextContent(EMPTY_DESCRIPTION)
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('AC5: shows the empty state for an empty spot list', () => {
      renderList({ spots: [] })

      expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: WANT_TAB_NAME })).toHaveAccessibleName(/^行きたい\s*0$/)
    })

    it('AC5: does not show the empty state when spots match', () => {
      renderList()

      expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument()
    })
  })

  describe('save notices (AC15, AC30)', () => {
    it("AC15/AC30: with saveNotice 'none' neither notice is shown", () => {
      renderList({ saveNotice: 'none' })

      expect(getRegion()).not.toHaveTextContent(NOT_PERSISTENT_NOTICE)
      expect(getRegion()).not.toHaveTextContent(NEWER_VERSION_NOTICE)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it("AC15: with saveNotice 'unavailable' the cannot-save notice is a status message below the chips and above the first card", () => {
      renderList({ saveNotice: 'unavailable' })

      const notice = screen.getByText(NOT_PERSISTENT_NOTICE)
      expect(screen.getByRole('status')).toBe(notice)
      expectFollows(screen.getByRole('group', { name: '種類で絞り込み' }), notice)
      expectFollows(notice, getCards()[0])
    })

    it('AC15: is shown above the empty state as well', () => {
      renderList({ saveNotice: 'unavailable', spots: [] })

      expectFollows(screen.getByText(NOT_PERSISTENT_NOTICE), screen.getByText(EMPTY_TITLE))
    })

    it("AC30: with saveNotice 'newer-version' the newer-version notice is the status message, in the same place", () => {
      renderList({ saveNotice: 'newer-version' })

      const notice = screen.getByRole('status')
      expect(notice).toHaveTextContent(NEWER_VERSION_NOTICE)
      expectFollows(screen.getByRole('group', { name: '種類で絞り込み' }), notice)
      expectFollows(notice, getCards()[0])
    })

    it('AC30: the newer-version notice replaces the cannot-save notice (never both)', () => {
      renderList({ saveNotice: 'newer-version' })

      expect(screen.getAllByRole('status')).toHaveLength(1)
      expect(getRegion()).not.toHaveTextContent(NOT_PERSISTENT_NOTICE)
    })

    it("AC30: the cannot-save notice does not show the newer-version text", () => {
      renderList({ saveNotice: 'unavailable' })

      expect(getRegion()).not.toHaveTextContent(NEWER_VERSION_NOTICE)
    })

    it('AC30: is shown above the empty state as well', () => {
      renderList({ saveNotice: 'newer-version', spots: [] })

      const notice = screen.getByRole('status')
      expect(notice).toHaveTextContent(NEWER_VERSION_NOTICE)
      expectFollows(notice, screen.getByText(EMPTY_TITLE))
    })
  })

  describe('backup button (AC31, AC38)', () => {
    it('AC31: is a real button next to the heading, before the tabs', () => {
      renderList()

      const backupButton = getBackupButton()
      expect(backupButton).toBeInstanceOf(HTMLButtonElement)
      expectFollows(getHeading(), backupButton)
      expectFollows(backupButton, screen.getByRole('group', { name: '一覧の切り替え' }))
    })

    it('AC31: calls onOpenBackup when pressed', async () => {
      const user = userEvent.setup()
      const { onOpenBackup, onAddSpot, onOpenSpot } = renderList()

      await user.click(getBackupButton())

      expect(onOpenBackup).toHaveBeenCalledTimes(1)
      expect(onAddSpot).not.toHaveBeenCalled()
      expect(onOpenSpot).not.toHaveBeenCalled()
    })

    it.each<[BackupReminder, string]>([
      ['none', BACKUP_LABEL],
      ['never', BACKUP_NEVER_LABEL],
      ['stale', BACKUP_STALE_LABEL],
    ])("AC38: with backupReminder '%s' its accessible name is %s", (backupReminder, expectedName) => {
      renderList({ backupReminder })

      expect(getBackupButton()).toHaveAccessibleName(expectedName)
      expect(screen.getAllByRole('button', { name: BACKUP_BUTTON_NAME })).toHaveLength(1)
    })

    it.each<BackupReminder>(['never', 'stale'])("AC31/AC38: with backupReminder '%s' it still opens the backup screen", async (backupReminder) => {
      const user = userEvent.setup()
      const { onOpenBackup } = renderList({ backupReminder })

      await user.click(getBackupButton())

      expect(onOpenBackup).toHaveBeenCalledTimes(1)
    })

    it('AC38: is there with an empty list and with a save notice', () => {
      renderList({ spots: [], saveNotice: 'newer-version' })

      expect(getBackupButton()).toHaveAccessibleName(BACKUP_LABEL)
    })
  })

  describe('restore hint (AC39)', () => {
    it('AC39: is shown when showRestoreHint is true', () => {
      renderList({ showRestoreHint: true })

      expect(getRegion()).toHaveTextContent(RESTORE_HINT)
    })

    it('AC39: is not shown when showRestoreHint is false', () => {
      renderList({ showRestoreHint: false })

      expect(getRegion()).not.toHaveTextContent(RESTORE_HINT)
    })

    it('AC39: is shown with an empty list too', () => {
      renderList({ showRestoreHint: true, spots: [] })

      expect(getRegion()).toHaveTextContent(RESTORE_HINT)
    })
  })

  describe('focus', () => {
    it('does not move focus on the first load (focusOnMount false)', () => {
      renderList({ focusOnMount: false, focusSpotId: 1 })

      expect(document.body).toHaveFocus()
    })

    it('does not move focus by default', () => {
      renderList()

      expect(document.body).toHaveFocus()
    })

    it('with focusOnMount and no focusSpotId, focuses the heading', () => {
      renderList({ focusOnMount: true })

      expect(getHeading()).toHaveFocus()
      expect(getHeading()).toHaveAttribute('tabindex', '-1')
    })

    it('with focusOnMount and a visible focusSpotId, focuses that card (coming back from its detail)', () => {
      renderList({ focusOnMount: true, focusSpotId: 4 })

      expect(getCard('銚子ドーバーライン')).toHaveFocus()
    })

    it('with focusOnMount and a focusSpotId that is filtered out, focuses the heading instead', () => {
      renderList({ focusOnMount: true, focusSpotId: 2, tab: 'want' })

      expect(getHeading()).toHaveFocus()
    })

    it('with focusOnMount and a focusSpotId that no longer exists (deleted), focuses the heading', () => {
      renderList({ focusOnMount: true, focusSpotId: 999 })

      expect(getHeading()).toHaveFocus()
    })
  })
})
