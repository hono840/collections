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
const EDIT_MEMO_LABEL = 'メモを編集'
const MEMO_FIELD_NAME = 'メモ'
const SAVE_MEMO_LABEL = '保存'
const CANCEL_MEMO_LABEL = 'キャンセル'
const EMPTY_MEMO_TEXT = 'メモはまだありません'

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
  const callbacks = { onBack: vi.fn(), onToggleDone: vi.fn(), onRemove: vi.fn(), onUpdateMemo: vi.fn() }
  const view = render(<SpotDetailScreen spot={spot} focusOnMount={focusOnMount} {...callbacks} />)
  return { ...callbacks, ...view }
}

type User = ReturnType<typeof userEvent.setup>

function getEditMemoButton(): HTMLElement {
  return screen.getByRole('button', { name: EDIT_MEMO_LABEL })
}

function getMemoField(): HTMLElement {
  return screen.getByRole('textbox', { name: MEMO_FIELD_NAME })
}

function queryMemoField(): HTMLElement | null {
  return screen.queryByRole('textbox', { name: MEMO_FIELD_NAME })
}

/** Presses メモを編集 and returns the memo text field. */
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

function expectNotEditingMemo() {
  expect(queryMemoField()).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: SAVE_MEMO_LABEL })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: CANCEL_MEMO_LABEL })).not.toBeInTheDocument()
}

/** Finds text exactly, line breaks included. */
function getTextKeepingLineBreaks(text: string): HTMLElement {
  return screen.getByText(text, { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) })
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
      const { rerender, onBack, onToggleDone, onRemove, onUpdateMemo } = renderDetail(WANT_SPOT)

      rerender(
        <SpotDetailScreen
          spot={{ ...WANT_SPOT, done: true }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onUpdateMemo={onUpdateMemo}
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

  describe('memo editing (AC23-AC25, AC29)', () => {
    it('AC23/AC29: shows a real メモを編集 button and no text field until it is pressed', () => {
      renderDetail(FILLED_SPOT)

      expect(getEditMemoButton()).toBeInstanceOf(HTMLButtonElement)
      expectNotEditingMemo()
      expect(getTextKeepingLineBreaks('一行目\n二行目')).toBeInTheDocument()
    })

    it('AC23: also offers メモを編集 when the memo is empty', () => {
      renderDetail(WANT_SPOT)

      expect(getEditMemoButton()).toBeInTheDocument()
      expect(screen.getByText(EMPTY_MEMO_TEXT)).toBeInTheDocument()
    })

    it('AC23/AC29: pressing メモを編集 turns the memo into a <textarea> named メモ holding the current memo, with 保存 and キャンセル', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)

      const memoField = await startEditingMemo(user)

      expect(memoField).toBeInstanceOf(HTMLTextAreaElement)
      expect(memoField).toHaveValue('一行目\n二行目')
      expect(screen.getByRole('button', { name: SAVE_MEMO_LABEL })).toBeInstanceOf(HTMLButtonElement)
      expect(screen.getByRole('button', { name: CANCEL_MEMO_LABEL })).toBeInstanceOf(HTMLButtonElement)
    })

    it('AC23: the text field gets focus when editing starts', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)

      const memoField = await startEditingMemo(user)

      expect(memoField).toHaveFocus()
    })

    it('AC23: an empty memo opens an empty text field in place of メモはまだありません', async () => {
      const user = userEvent.setup()
      renderDetail(WANT_SPOT)

      const memoField = await startEditingMemo(user)

      expect(memoField).toHaveValue('')
      expect(screen.queryByText(EMPTY_MEMO_TEXT)).not.toBeInTheDocument()
    })

    it('AC23: the text field starts from the memo the screen shows now (after the parent passed a changed spot)', async () => {
      const user = userEvent.setup()
      const { rerender, onBack, onToggleDone, onRemove, onUpdateMemo } = renderDetail(FILLED_SPOT)
      rerender(
        <SpotDetailScreen
          spot={{ ...FILLED_SPOT, memo: '別のタブで書いたメモ' }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onUpdateMemo={onUpdateMemo}
        />,
      )

      const memoField = await startEditingMemo(user)

      expect(memoField).toHaveValue('別のタブで書いたメモ')
    })

    it('AC23/AC29: editing can be started with the keyboard', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)
      getEditMemoButton().focus()

      await user.keyboard('{Enter}')

      expect(getMemoField()).toHaveFocus()
    })

    it('AC24: 保存 passes the text exactly as typed to onUpdateMemo once (trimming is done by the data layer)', async () => {
      const user = userEvent.setup()
      const { onUpdateMemo, onBack, onToggleDone, onRemove } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '  朝7時に出発{Enter}菜の花台で休憩　')

      await user.click(screen.getByRole('button', { name: SAVE_MEMO_LABEL }))

      expect(onUpdateMemo).toHaveBeenCalledTimes(1)
      expect(onUpdateMemo).toHaveBeenCalledWith('  朝7時に出発\n菜の花台で休憩　')
      expect(onBack).not.toHaveBeenCalled()
      expect(onToggleDone).not.toHaveBeenCalled()
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('AC24: 保存 with an emptied text field passes an empty memo', async () => {
      const user = userEvent.setup()
      const { onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '')

      await user.click(screen.getByRole('button', { name: SAVE_MEMO_LABEL }))

      expect(onUpdateMemo).toHaveBeenCalledTimes(1)
      expect(onUpdateMemo).toHaveBeenCalledWith('')
    })

    it('AC24: Enter in the text field adds a line break and does not save', async () => {
      const user = userEvent.setup()
      const { onUpdateMemo } = renderDetail(FILLED_SPOT)

      const memoField = await typeMemoDraft(user, '一行目{Enter}二行目{Enter}三行目')

      expect(memoField).toHaveValue('一行目\n二行目\n三行目')
      expect(onUpdateMemo).not.toHaveBeenCalled()
      expect(getMemoField()).toBe(memoField)
    })

    it('AC24: after 保存, editing ends and focus returns to メモを編集', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '新しいメモ')

      await user.click(screen.getByRole('button', { name: SAVE_MEMO_LABEL }))

      expectNotEditingMemo()
      expect(getEditMemoButton()).toHaveFocus()
    })

    it('AC24: once the parent passes the saved memo, the screen shows it with its line breaks', async () => {
      const user = userEvent.setup()
      const { rerender, onBack, onToggleDone, onRemove, onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '朝7時に出発{Enter}菜の花台で休憩')
      await user.click(screen.getByRole('button', { name: SAVE_MEMO_LABEL }))

      rerender(
        <SpotDetailScreen
          spot={{ ...FILLED_SPOT, memo: '朝7時に出発\n菜の花台で休憩' }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onUpdateMemo={onUpdateMemo}
        />,
      )

      expect(getTextKeepingLineBreaks('朝7時に出発\n菜の花台で休憩')).toBeInTheDocument()
      expectNotEditingMemo()
    })

    it('AC24: once the parent passes an emptied memo, the screen shows メモはまだありません', async () => {
      const user = userEvent.setup()
      const { rerender, onBack, onToggleDone, onRemove, onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '')
      await user.click(screen.getByRole('button', { name: SAVE_MEMO_LABEL }))

      rerender(
        <SpotDetailScreen
          spot={{ ...FILLED_SPOT, memo: '' }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onUpdateMemo={onUpdateMemo}
        />,
      )

      expect(screen.getByText(EMPTY_MEMO_TEXT)).toBeInTheDocument()
    })

    it('AC25: キャンセル does not call onUpdateMemo, ends editing and returns focus to メモを編集', async () => {
      const user = userEvent.setup()
      const { onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '捨てる下書き')

      await user.click(screen.getByRole('button', { name: CANCEL_MEMO_LABEL }))

      expect(onUpdateMemo).not.toHaveBeenCalled()
      expectNotEditingMemo()
      expect(getEditMemoButton()).toHaveFocus()
      expect(getTextKeepingLineBreaks('一行目\n二行目')).toBeInTheDocument()
      expect(screen.queryByText('捨てる下書き')).not.toBeInTheDocument()
    })

    it('AC25: キャンセル discards the draft, so editing again starts from the memo', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '捨てる下書き')
      await user.click(screen.getByRole('button', { name: CANCEL_MEMO_LABEL }))

      const memoField = await startEditingMemo(user)

      expect(memoField).toHaveValue('一行目\n二行目')
    })

    it('AC25: the back button while editing calls onBack and does not save', async () => {
      const user = userEvent.setup()
      const { onBack, onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '捨てる下書き')

      await user.click(screen.getByRole('button', { name: BACK_LABEL }))

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(onUpdateMemo).not.toHaveBeenCalled()
    })

    it('AC25: leaving the screen (unmount) while editing discards the draft', async () => {
      const user = userEvent.setup()
      const { unmount, onUpdateMemo } = renderDetail(FILLED_SPOT)
      await typeMemoDraft(user, '捨てる下書き')
      unmount()

      renderDetail(FILLED_SPOT)

      expect(onUpdateMemo).not.toHaveBeenCalled()
      expectNotEditingMemo()
      expect(getTextKeepingLineBreaks('一行目\n二行目')).toBeInTheDocument()
    })

    it('AC25: toggling 行った while editing (staying on the detail) keeps the draft and the edit mode', async () => {
      const user = userEvent.setup()
      const { rerender, onBack, onToggleDone, onRemove, onUpdateMemo } = renderDetail(WANT_SPOT)
      await typeMemoDraft(user, '行く前に天気を確認')

      await user.click(screen.getByRole('button', { name: MARK_DONE_LABEL }))
      // The parent passes the toggled spot back, as DriveSpotsApp does.
      rerender(
        <SpotDetailScreen
          spot={{ ...WANT_SPOT, done: true }}
          onBack={onBack}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onUpdateMemo={onUpdateMemo}
        />,
      )

      expect(onToggleDone).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: MARK_WANT_LABEL })).toBeInTheDocument()
      expect(getMemoField()).toHaveValue('行く前に天気を確認')
      expect(screen.getByRole('button', { name: SAVE_MEMO_LABEL })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: CANCEL_MEMO_LABEL })).toBeInTheDocument()
      expect(onUpdateMemo).not.toHaveBeenCalled()
    })

    it('AC29/AC8: starting to edit the memo cancels a first delete press', async () => {
      const user = userEvent.setup()
      const { onRemove } = renderDetail(FILLED_SPOT)
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))
      expect(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL })).toBeInTheDocument()

      await startEditingMemo(user)

      expect(screen.queryByRole('button', { name: DELETE_CONFIRM_LABEL })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: CANCEL_MEMO_LABEL }))
      await user.click(screen.getByRole('button', { name: DELETE_LABEL }))

      expect(onRemove).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: DELETE_CONFIRM_LABEL })).toBeInTheDocument()
    })

    it('AC29/AC18: while editing, every control is a real <button>', async () => {
      const user = userEvent.setup()
      renderDetail(FILLED_SPOT)

      await startEditingMemo(user)

      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeInstanceOf(HTMLButtonElement)
        expect(button).toHaveAttribute('type', 'button')
      }
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
