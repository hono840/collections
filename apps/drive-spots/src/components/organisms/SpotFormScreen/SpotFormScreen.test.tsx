import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SpotInput } from '@/lib/spots/types'
import { SpotFormScreen } from './SpotFormScreen'

const NAME_LABEL = 'スポット名（必須）'
const REGION_LABEL = '地域'
const DISTANCE_LABEL = '片道の距離（km）'
const SEASON_LABEL = 'おすすめ時期'
const MEMO_LABEL = 'メモ'
const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'
const CATEGORY_LABELS = ['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速']
const SAVE_BUTTON_NAMES = ['保存', '保存する']

function renderForm(focusOnMount?: boolean) {
  const user = userEvent.setup()
  const onCancel = vi.fn()
  const onSave = vi.fn<(input: SpotInput) => void>()
  render(<SpotFormScreen onCancel={onCancel} onSave={onSave} focusOnMount={focusOnMount} />)
  return { user, onCancel, onSave }
}

function getField(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

function getCategoryGroup(): HTMLElement {
  return screen.getByRole('group', { name: '種類' })
}

describe('SpotFormScreen', () => {
  describe('fields (AC9)', () => {
    it('AC9: is a region named by its level-1 heading スポットを追加', () => {
      renderForm()

      expect(screen.getByRole('heading', { level: 1, name: 'スポットを追加' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'スポットを追加' })).toBeInTheDocument()
    })

    it('AC9/AC18: every text field is a labelled <input>, the memo a labelled <textarea>, all empty', () => {
      renderForm()

      for (const label of [NAME_LABEL, REGION_LABEL, DISTANCE_LABEL, SEASON_LABEL]) {
        expect(getField(label)).toBeInstanceOf(HTMLInputElement)
        expect(getField(label)).toHaveValue('')
      }
      expect(getField(MEMO_LABEL)).toBeInstanceOf(HTMLTextAreaElement)
      expect(getField(MEMO_LABEL)).toHaveValue('')
    })

    it('AC11: the distance field is a text field that opens the decimal keypad', () => {
      renderForm()

      expect(getField(DISTANCE_LABEL)).toHaveAttribute('type', 'text')
      expect(getField(DISTANCE_LABEL)).toHaveAttribute('inputmode', 'decimal')
    })

    it('AC9: shows the design placeholders', () => {
      renderForm()

      expect(getField(NAME_LABEL)).toHaveAttribute('placeholder', '例：ヤビツ峠')
      expect(getField(REGION_LABEL)).toHaveAttribute('placeholder', '例：神奈川')
      expect(getField(DISTANCE_LABEL)).toHaveAttribute('placeholder', '例：60')
      expect(getField(SEASON_LABEL)).toHaveAttribute('placeholder', '例：紅葉の季節、早朝')
      expect(getField(MEMO_LABEL)).toHaveAttribute('placeholder', '例：冬は通行止め。帰りに寄りたいお店など')
    })

    it('AC9: the 種類 group has the five categories in order, with 峠 selected by default', () => {
      renderForm()

      const chips = within(getCategoryGroup()).getAllByRole('button')
      expect(chips.map((chip) => chip.textContent)).toEqual(CATEGORY_LABELS)
      for (const chip of chips) {
        expect(chip).toHaveAttribute('aria-pressed', chip.textContent === '峠' ? 'true' : 'false')
      }
    })

    it('AC9: picking a category selects only that category', async () => {
      const { user } = renderForm()

      await user.click(within(getCategoryGroup()).getByRole('button', { name: 'サーキット' }))

      for (const chip of within(getCategoryGroup()).getAllByRole('button')) {
        expect(chip).toHaveAttribute('aria-pressed', chip.textContent === 'サーキット' ? 'true' : 'false')
      }
    })

    it('AC9: has キャンセル, the header 保存 and the bottom 保存する buttons', () => {
      renderForm()

      for (const buttonName of ['キャンセル', ...SAVE_BUTTON_NAMES]) {
        const button = screen.getByRole('button', { name: buttonName })
        expect(button).toBeInstanceOf(HTMLButtonElement)
        expect(button).toHaveAttribute('type', 'button')
      }
    })

    it('does not render a <form> (Enter in a field must not submit; the CSP blocks form actions)', () => {
      const { container } = render(<SpotFormScreen onCancel={vi.fn()} onSave={vi.fn()} />)

      expect(container.querySelector('form')).toBeNull()
    })
  })

  describe('cancel (AC9)', () => {
    it('AC9: キャンセル calls onCancel and never onSave', async () => {
      const { user, onCancel, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), '捨てるスポット')

      await user.click(screen.getByRole('button', { name: 'キャンセル' }))

      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('saving (AC12)', () => {
    it.each(SAVE_BUTTON_NAMES)('AC12: %s calls onSave once with every field as typed (untrimmed)', async (saveButtonName) => {
      const { user, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), ' 大観山 ')
      await user.click(within(getCategoryGroup()).getByRole('button', { name: '絶景ロード' }))
      await user.type(getField(REGION_LABEL), '神奈川')
      await user.type(getField(DISTANCE_LABEL), '12.5')
      await user.type(getField(SEASON_LABEL), '紅葉の季節')
      await user.type(getField(MEMO_LABEL), '一行目{Enter}二行目')

      await user.click(screen.getByRole('button', { name: saveButtonName }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        name: ' 大観山 ',
        region: '神奈川',
        category: '絶景ロード',
        distanceKm: '12.5',
        season: '紅葉の季節',
        memo: '一行目\n二行目',
      } satisfies SpotInput)
    })

    it('AC9: saves with 峠 when the category was not changed', async () => {
      const { user, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), 'ヤビツ峠')

      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).toHaveBeenCalledWith({
        name: 'ヤビツ峠',
        region: '',
        category: '峠',
        distanceKm: '',
        season: '',
        memo: '',
      } satisfies SpotInput)
    })

    it('pressing Enter in a single-line field does not save', async () => {
      const { user, onSave } = renderForm()

      await user.type(getField(NAME_LABEL), '大観山{Enter}')

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('validation (AC10, AC11)', () => {
    it('AC10: shows no error before the first save', () => {
      renderForm()

      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
      expect(getField(NAME_LABEL)).not.toBeInvalid()
    })

    it.each(SAVE_BUTTON_NAMES)(
      `AC10: %s with an empty name shows '${NAME_REQUIRED_MESSAGE}', does not save and focuses the name`,
      async (saveButtonName) => {
        const { user, onSave } = renderForm()

        await user.click(screen.getByRole('button', { name: saveButtonName }))

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
        expect(getField(NAME_LABEL)).toHaveAttribute('aria-invalid', 'true')
        expect(getField(NAME_LABEL)).toHaveAccessibleDescription(NAME_REQUIRED_MESSAGE)
        expect(getField(NAME_LABEL)).toHaveFocus()
      },
    )

    it('AC10: a whitespace-only name is rejected', async () => {
      const { user, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), '　 ')

      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
    })

    it.each(SAVE_BUTTON_NAMES)(
      `AC11: %s with an invalid distance shows '${DISTANCE_INVALID_MESSAGE}', does not save and focuses the distance`,
      async (saveButtonName) => {
        const { user, onSave } = renderForm()
        await user.type(getField(NAME_LABEL), '大観山')
        await user.type(getField(DISTANCE_LABEL), '-1')

        await user.click(screen.getByRole('button', { name: saveButtonName }))

        expect(onSave).not.toHaveBeenCalled()
        expect(getField(DISTANCE_LABEL)).toHaveAttribute('aria-invalid', 'true')
        expect(getField(DISTANCE_LABEL)).toHaveAccessibleDescription(DISTANCE_INVALID_MESSAGE)
        expect(getField(DISTANCE_LABEL)).toHaveFocus()
        expect(getField(NAME_LABEL)).not.toBeInvalid()
      },
    )

    it('AC10/AC11: with both errors, shows both and focuses the name (the first invalid field)', async () => {
      const { user, onSave } = renderForm()
      await user.type(getField(DISTANCE_LABEL), 'abc')

      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(getField(NAME_LABEL)).toHaveAccessibleDescription(NAME_REQUIRED_MESSAGE)
      expect(getField(DISTANCE_LABEL)).toHaveAccessibleDescription(DISTANCE_INVALID_MESSAGE)
      expect(getField(NAME_LABEL)).toHaveFocus()
    })

    it('AC10: typing in the name again hides the name error but keeps the distance error', async () => {
      const { user } = renderForm()
      await user.type(getField(DISTANCE_LABEL), '-1')
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.type(getField(NAME_LABEL), '大')

      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
      expect(getField(NAME_LABEL)).not.toBeInvalid()
      expect(getField(NAME_LABEL)).not.toHaveAttribute('aria-describedby')
      expect(screen.getByText(DISTANCE_INVALID_MESSAGE)).toBeInTheDocument()
    })

    it('AC11: editing the distance hides the distance error', async () => {
      const { user } = renderForm()
      await user.type(getField(NAME_LABEL), '大観山')
      await user.type(getField(DISTANCE_LABEL), '-1')
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.clear(getField(DISTANCE_LABEL))

      expect(screen.queryByText(DISTANCE_INVALID_MESSAGE)).not.toBeInTheDocument()
      expect(getField(DISTANCE_LABEL)).not.toBeInvalid()
    })

    it('AC10/AC12: after fixing the name, saving calls onSave', async () => {
      const { user, onSave } = renderForm()
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.type(getField(NAME_LABEL), '大観山')
      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0]).toMatchObject({ name: '大観山' })
    })

    it('editing region, season or memo does not clear an existing name error', async () => {
      const { user } = renderForm()
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.type(getField(REGION_LABEL), '神奈川')
      await user.type(getField(SEASON_LABEL), '春')
      await user.type(getField(MEMO_LABEL), 'メモ')

      expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
    })
  })

  describe('focus', () => {
    it('focusOnMount moves focus to the title', () => {
      renderForm(true)

      const heading = screen.getByRole('heading', { level: 1, name: 'スポットを追加' })
      expect(heading).toHaveFocus()
      expect(heading).toHaveAttribute('tabindex', '-1')
    })

    it('does not move focus without focusOnMount', () => {
      renderForm()

      expect(document.body).toHaveFocus()
    })
  })
})
