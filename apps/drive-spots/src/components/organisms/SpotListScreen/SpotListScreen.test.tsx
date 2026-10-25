import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryFilter, Spot, Tab } from '@/lib/spots/types'
import { SpotListScreen } from './SpotListScreen'

const NOT_PERSISTENT_NOTICE = 'この端末では保存できません（再読み込みで消えます）'
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

type ListProps = {
  spots?: Spot[]
  tab?: Tab
  category?: CategoryFilter
  persistent?: boolean
  focusOnMount?: boolean
  focusSpotId?: number | null
}

function renderList(props: ListProps = {}) {
  const callbacks = {
    onTabChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onOpenSpot: vi.fn(),
    onAddSpot: vi.fn(),
  }
  const view = render(
    <SpotListScreen
      spots={props.spots ?? SAMPLE_SPOTS}
      tab={props.tab ?? 'want'}
      category={props.category ?? 'すべて'}
      persistent={props.persistent ?? true}
      focusOnMount={props.focusOnMount}
      focusSpotId={props.focusSpotId}
      {...callbacks}
    />,
  )
  return { ...callbacks, ...view }
}

function getHeading(): HTMLElement {
  return screen.getByRole('heading', { level: 1, name: '行きたい道ノート' })
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
    it('AC1: is a region named by its heading 行きたい道ノート', () => {
      renderList()

      expect(getHeading()).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '行きたい道ノート' })).toBeInTheDocument()
      expect(screen.getByText('DRIVE LIST')).toBeInTheDocument()
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
      expect(screen.getByRole('region', { name: '行きたい道ノート' })).toHaveTextContent(EMPTY_DESCRIPTION)
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

  describe('cannot-save notice (AC15)', () => {
    it('AC15: is not shown while persistent is true', () => {
      renderList({ persistent: true })

      expect(screen.queryByText(NOT_PERSISTENT_NOTICE)).not.toBeInTheDocument()
    })

    it('AC15: is shown as a status message below the chips and above the first card when persistent is false', () => {
      renderList({ persistent: false })

      const notice = screen.getByText(NOT_PERSISTENT_NOTICE)
      expect(screen.getByRole('status')).toBe(notice)
      expectFollows(screen.getByRole('group', { name: '種類で絞り込み' }), notice)
      expectFollows(notice, getCards()[0])
    })

    it('AC15: is shown above the empty state as well', () => {
      renderList({ persistent: false, spots: [] })

      expectFollows(screen.getByText(NOT_PERSISTENT_NOTICE), screen.getByText(EMPTY_TITLE))
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
