import { getDefaultNormalizer, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Spot } from '@/lib/spots/types'
import { SpotDetailScreen } from './SpotDetailScreen'

const BACK_LABEL = '一覧にもどる'
const MARK_DONE_LABEL = '行った！にする'
const MARK_WANT_LABEL = '「行きたい」に戻す'
const DELETE_LABEL = 'このスポットを削除'
const DELETE_CONFIRM_LABEL = 'もう一度押すと削除します'

const WANT_SPOT: Spot = {
  id: 1,
  name: 'ヤビツ峠',
  region: '神奈川',
  category: '峠',
  distanceKm: '',
  season: '',
  memo: '',
  done: false,
}

const FILLED_SPOT: Spot = {
  id: 20,
  name: '大観山',
  region: '神奈川',
  category: '絶景ロード',
  distanceKm: '60',
  season: '紅葉の季節',
  memo: '一行目\n二行目',
  done: true,
}

function renderDetail(spot: Spot = WANT_SPOT, focusOnMount?: boolean) {
  const callbacks = { onBack: vi.fn(), onToggleDone: vi.fn(), onRemove: vi.fn() }
  const view = render(<SpotDetailScreen spot={spot} focusOnMount={focusOnMount} {...callbacks} />)
  return { ...callbacks, ...view }
}

/** The info tile (dt + dd wrapper) holding the label. */
function getInfoTile(label: string): HTMLElement {
  const tile = screen.getByText(label).parentElement
  if (tile === null) {
    throw new Error(`No info tile for ${label}`)
  }
  return tile
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SpotDetailScreen', () => {
  describe('content (AC6)', () => {
    it('AC6: shows the spot name as the level-1 heading that names the region', () => {
      renderDetail()

      expect(screen.getByRole('heading', { level: 1, name: 'ヤビツ峠' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'ヤビツ峠' })).toBeInTheDocument()
    })

    it('AC6: shows the category badge', () => {
      renderDetail({ ...WANT_SPOT, category: '海沿い' })

      expect(screen.getByText('海沿い')).toBeInTheDocument()
    })

    it('AC6: shows the 行った badge only when the spot is done', () => {
      const { unmount } = renderDetail(WANT_SPOT)
      expect(screen.queryByText('行った')).not.toBeInTheDocument()
      unmount()

      renderDetail({ ...WANT_SPOT, done: true })

      expect(screen.getByText('行った')).toBeInTheDocument()
    })

    it('AC6: shows the region', () => {
      renderDetail()

      expect(getInfoTile('地域')).toHaveTextContent(/^地域\s*神奈川$/)
    })

    it("AC6: an empty distance and season show '未入力'", () => {
      renderDetail()

      expect(getInfoTile('自宅からの距離（片道）')).toHaveTextContent(/^自宅からの距離（片道）\s*未入力$/)
      expect(getInfoTile('おすすめ時期')).toHaveTextContent(/^おすすめ時期\s*未入力$/)
    })

    it("AC6: a distance shows as '約 N km' and the season as entered", () => {
      renderDetail(FILLED_SPOT)

      expect(getInfoTile('自宅からの距離（片道）')).toHaveTextContent(/^自宅からの距離（片道）\s*約 60 km$/)
      expect(getInfoTile('おすすめ時期')).toHaveTextContent(/^おすすめ時期\s*紅葉の季節$/)
    })

    it("AC6: an empty memo shows 'メモはまだありません' under the メモ heading", () => {
      renderDetail()

      expect(screen.getByRole('heading', { name: 'メモ' })).toBeInTheDocument()
      expect(screen.getByText('メモはまだありません')).toBeInTheDocument()
    })

    it('AC6: a memo keeps its line breaks', () => {
      renderDetail(FILLED_SPOT)

      expect(
        screen.getByText('一行目\n二行目', { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }),
      ).toBeInTheDocument()
      expect(screen.queryByText('メモはまだありません')).not.toBeInTheDocument()
    })

    it("AC6: the region shows as given, including '未入力'", () => {
      renderDetail({ ...WANT_SPOT, region: '未入力' })

      expect(getInfoTile('地域')).toHaveTextContent(/^地域\s*未入力$/)
    })
  })

  describe('back (AC6)', () => {
    it('AC6: the back button is named 一覧にもどる and calls onBack', async () => {
      const user = userEvent.setup()
      const { onBack } = renderDetail()

      const backButton = screen.getByRole('button', { name: BACK_LABEL })
      expect(backButton).toBeInstanceOf(HTMLButtonElement)
      await user.click(backButton)

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('AC6: the back arrow icon is decorative', () => {
      renderDetail()

      const backButton = screen.getByRole('button', { name: BACK_LABEL })
      for (const svg of backButton.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      }
    })
  })

  describe('toggle done (AC7)', () => {
    it('AC7: a 行きたい spot shows 行った！にする, which calls onToggleDone', async () => {
      const user = userEvent.setup()
      const { onToggleDone } = renderDetail(WANT_SPOT)

      await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))

      expect(onToggleDone).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: MARK_WANT_LABEL })).not.toBeInTheDocument()
    })

    it('AC7: a 行った spot shows 「行きたい」に戻す, which calls onToggleDone', async () => {
      const user = userEvent.setup()
      const { onToggleDone } = renderDetail({ ...WANT_SPOT, done: true })

      await user.click(screen.getByRole('button', { name: MARK_WANT_LABEL }))

      expect(onToggleDone).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: MARK_DONE_LABEL })).not.toBeInTheDocument()
    })

    it('AC7: the button follows the spot when the parent passes the toggled spot', () => {
      const { rerender, onBack, onToggleDone, onRemove } = renderDetail(WANT_SPOT)

      rerender(
        <SpotDetailScreen
          spot={{ ...WANT_SPOT, done: true }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
        />,
      )

      expect(screen.getByRole('button', { name: MARK_WANT_LABEL })).toBeInTheDocument()
      expect(screen.getByText('行った')).toBeInTheDocument()
    })
  })

  describe('two-press delete (AC8)', () => {
    it('AC8: the first press only changes the label to もう一度押すと削除します', async () => {
      const user = userEvent.setup()
      const { onRemove } = renderDetail()

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      expect(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: DELETE_LABEL })).not.toBeInTheDocument()
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('AC8: the second press calls onRemove once', async () => {
      const user = userEvent.setup()
      const { onRemove } = renderDetail()

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))

      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it('AC8: the same button keeps focus between the two presses (keyboard users press it twice)', async () => {
      const user = userEvent.setup()
      const { onRemove } = renderDetail()
      const deleteButton = screen.getByRole('button', { name: DELETE_LABEL })
      deleteButton.focus()

      await user.keyboard('{Enter}')

      expect(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL })).toBe(deleteButton)
      expect(deleteButton).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it('AC8: does not use window.confirm', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderDetail()

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL }))

      expect(confirmSpy).not.toHaveBeenCalled()
    })

    it('AC8: pressing the toggle button cancels a first delete press', async () => {
      const user = userEvent.setup()
      const { onRemove, onToggleDone } = renderDetail()
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))

      expect(onToggleDone).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: DELETE_LABEL })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: DELETE_CONFIRM_LABEL })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      expect(onRemove).not.toHaveBeenCalled()
    })

    it('AC8: leaving the screen (unmount) cancels a first delete press', async () => {
      const user = userEvent.setup()
      const { unmount } = renderDetail()
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      unmount()

      renderDetail()

      expect(screen.getByRole('button', { name: DELETE_LABEL })).toBeInTheDocument()
    })

    it('AC8: pressing back does not delete', async () => {
      const user = userEvent.setup()
      const { onRemove, onBack } = renderDetail()
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(onRemove).not.toHaveBeenCalled()
    })
  })

  describe('focus', () => {
    it('focusOnMount moves focus to the spot name heading', () => {
      renderDetail(WANT_SPOT, true)

      const heading = screen.getByRole('heading', { level: 1, name: 'ヤビツ峠' })
      expect(heading).toHaveFocus()
      expect(heading).toHaveAttribute('tabindex', '-1')
    })

    it('does not move focus without focusOnMount', () => {
      renderDetail(WANT_SPOT)

      expect(document.body).toHaveFocus()
    })

    it('AC18: every control is a real <button>', () => {
      renderDetail(FILLED_SPOT)

      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeInstanceOf(HTMLButtonElement)
        expect(button).toHaveAttribute('type', 'button')
      }
    })
  })
})
