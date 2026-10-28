import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SpotInput } from '@/lib/spots/types'
import { SpotFormScreen } from './SpotFormScreen'

const NAME_LABEL = 'スポット名（必須）'
const REGION_LABEL = '地域'
const DISTANCE_LABEL = '片道の距離（km）'
const EXIT_INTERCHANGE_LABEL = '降りるIC'
const SEASON_LABEL = 'おすすめ時期'
const MEMO_LABEL = 'メモ'
const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'
const CATEGORY_LABELS = ['峠', '絶景ロード', '海沿い', 'サーキット', '都市高速']
const SAVE_BUTTON_NAMES = ['保存', '保存する']
const ADD_TITLE = 'スポットを追加'
const EDIT_TITLE = 'スポットを編集'
/** The text fields in the order of docs/design/spot-edit.md 「欄の並び」 (種類 sits between name and region). */
const TEXT_FIELD_LABELS_IN_ORDER = [
  NAME_LABEL,
  REGION_LABEL,
  DISTANCE_LABEL,
  EXIT_INTERCHANGE_LABEL,
  SEASON_LABEL,
  MEMO_LABEL,
]

/** A saved spot as the edit form gets it (spotToInput): every field filled. */
const SAVED_INPUT: SpotInput = {
  name: '大観山',
  region: '神奈川',
  category: '絶景ロード',
  distanceKm: '60',
  exitInterchange: '小田原西IC',
  season: '紅葉の季節',
  memo: '一行目\n二行目',
}

function renderForm(focusOnMount?: boolean) {
  const user = userEvent.setup()
  const onCancel = vi.fn()
  const onSave = vi.fn<(input: SpotInput) => void>()
  render(<SpotFormScreen onCancel={onCancel} onSave={onSave} focusOnMount={focusOnMount} />)
  return { user, onCancel, onSave }
}

type FormScreenProps = Partial<React.ComponentProps<typeof SpotFormScreen>>

/** Renders with any props (mode, initialInput, focusOnMount); rerenderWith keeps the same callbacks. */
function renderFormWith(props: FormScreenProps) {
  const user = userEvent.setup()
  const onCancel = vi.fn()
  const onSave = vi.fn<(input: SpotInput) => void>()
  const renderScreen = (screenProps: FormScreenProps) => (
    <SpotFormScreen onCancel={onCancel} onSave={onSave} {...screenProps} />
  )
  const view = render(renderScreen(props))
  const rerenderWith = (changedProps: FormScreenProps) => view.rerender(renderScreen({ ...props, ...changedProps }))
  return { user, onCancel, onSave, ...view, rerenderWith }
}

/** Replaces a field's text (user-event syntax: {Enter} is a line break). */
async function replaceFieldText(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  const field = getField(label)
  await user.clear(field)
  if (text !== '') await user.type(field, text)
}

function expectOnlyCategorySelected(category: string) {
  for (const chip of within(getCategoryGroup()).getAllByRole('button')) {
    expect(chip).toHaveAttribute('aria-pressed', chip.textContent === category ? 'true' : 'false')
  }
}

/** The closest element that contains both. */
function getCommonAncestor(firstElement: Element, secondElement: Element): Element {
  let ancestor: Element | null = firstElement
  while (ancestor !== null && !ancestor.contains(secondElement)) {
    ancestor = ancestor.parentElement
  }
  if (ancestor === null) {
    throw new Error('The elements share no ancestor')
  }
  return ancestor
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

      for (const label of [NAME_LABEL, REGION_LABEL, DISTANCE_LABEL, EXIT_INTERCHANGE_LABEL, SEASON_LABEL]) {
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

    it('AC47: the 降りるIC field is a labelled one-line <input> with the placeholder 例：小田原西IC', () => {
      renderForm()

      const exitInterchangeField = getField(EXIT_INTERCHANGE_LABEL)
      expect(exitInterchangeField).toBeInstanceOf(HTMLInputElement)
      expect(exitInterchangeField).toHaveAttribute('type', 'text')
      expect(exitInterchangeField).toHaveAttribute('placeholder', '例：小田原西IC')
      expect(exitInterchangeField).toHaveValue('')
    })

    it('AC47: the 降りるIC field opens the ordinary keyboard (no inputmode) and is not required', () => {
      renderForm()

      expect(getField(EXIT_INTERCHANGE_LABEL)).not.toHaveAttribute('inputmode')
      expect(getField(EXIT_INTERCHANGE_LABEL)).not.toBeRequired()
      expect(getField(EXIT_INTERCHANGE_LABEL)).not.toBeInvalid()
    })

    it('AC9/AC47: the fields are in the order 名前, 種類, 地域, 距離, 降りるIC, おすすめ時期, メモ, then 保存する', () => {
      renderForm()

      const textFields = screen.getAllByRole('textbox')
      expect(textFields).toHaveLength(TEXT_FIELD_LABELS_IN_ORDER.length)
      TEXT_FIELD_LABELS_IN_ORDER.forEach((label, index) => {
        expect(textFields[index], `field ${index + 1} is ${label}`).toBe(getField(label))
      })
      const followsName = getField(NAME_LABEL).compareDocumentPosition(getCategoryGroup())
      expect(followsName & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      const followsCategory = getCategoryGroup().compareDocumentPosition(getField(REGION_LABEL))
      expect(followsCategory & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      const followsMemo = getField(MEMO_LABEL).compareDocumentPosition(screen.getByRole('button', { name: '保存する' }))
      expect(followsMemo & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('AC47: 降りるIC is below the 地域｜距離 pair, not inside it (its own full-width row)', () => {
      renderForm()

      const regionAndDistancePair = getCommonAncestor(getField(REGION_LABEL), getField(DISTANCE_LABEL))
      expect(regionAndDistancePair.contains(getField(EXIT_INTERCHANGE_LABEL))).toBe(false)
      expect(regionAndDistancePair.contains(getField(SEASON_LABEL))).toBe(false)
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
      await user.type(getField(EXIT_INTERCHANGE_LABEL), ' 小田原西IC ')
      await user.type(getField(SEASON_LABEL), '紅葉の季節')
      await user.type(getField(MEMO_LABEL), '一行目{Enter}二行目')

      await user.click(screen.getByRole('button', { name: saveButtonName }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        name: ' 大観山 ',
        region: '神奈川',
        category: '絶景ロード',
        distanceKm: '12.5',
        exitInterchange: ' 小田原西IC ',
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
        exitInterchange: '',
        season: '',
        memo: '',
      } satisfies SpotInput)
    })

    it('pressing Enter in a single-line field does not save', async () => {
      const { user, onSave } = renderForm()

      await user.type(getField(NAME_LABEL), '大観山{Enter}')

      expect(onSave).not.toHaveBeenCalled()
    })

    it('AC47: pressing Enter in 降りるIC does not save either', async () => {
      const { user, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), '大観山')

      await user.type(getField(EXIT_INTERCHANGE_LABEL), '小田原西IC{Enter}')

      expect(onSave).not.toHaveBeenCalled()
    })

    it.each(['-1', 'abc', '１２', '<b>IC</b>'])('AC47: 降りるIC never has an error: %j saves as typed', async (exitInterchange) => {
      const { user, onSave } = renderForm()
      await user.type(getField(NAME_LABEL), '大観山')
      await user.type(getField(EXIT_INTERCHANGE_LABEL), exitInterchange)

      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0]).toMatchObject({ exitInterchange })
      expect(getField(EXIT_INTERCHANGE_LABEL)).not.toBeInvalid()
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

    it('editing region, 降りるIC, season or memo does not clear an existing name error', async () => {
      const { user } = renderForm()
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.type(getField(REGION_LABEL), '神奈川')
      await user.type(getField(EXIT_INTERCHANGE_LABEL), '小田原西IC')
      await user.type(getField(SEASON_LABEL), '春')
      await user.type(getField(MEMO_LABEL), 'メモ')

      expect(screen.getByText(NAME_REQUIRED_MESSAGE)).toBeInTheDocument()
    })
  })

  describe('mode (AC42)', () => {
    it("AC9: without mode, the title is スポットを追加 (mode 'add' is the default)", () => {
      renderFormWith({})

      expect(screen.getByRole('heading', { level: 1, name: ADD_TITLE })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: EDIT_TITLE })).not.toBeInTheDocument()
    })

    it("AC9: mode 'add' is titled スポットを追加", () => {
      renderFormWith({ mode: 'add' })

      expect(screen.getByRole('region', { name: ADD_TITLE })).toBeInTheDocument()
    })

    it("AC42: mode 'edit' is a region named by its level-1 heading スポットを編集", () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      expect(screen.getByRole('heading', { level: 1, name: EDIT_TITLE })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: EDIT_TITLE })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: ADD_TITLE })).not.toBeInTheDocument()
    })

    it("AC42: mode 'edit' has the same fields and the same キャンセル / 保存 / 保存する buttons as adding", () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      const textFields = screen.getAllByRole('textbox')
      expect(textFields).toHaveLength(TEXT_FIELD_LABELS_IN_ORDER.length)
      TEXT_FIELD_LABELS_IN_ORDER.forEach((label, index) => {
        expect(textFields[index], `field ${index + 1} is ${label}`).toBe(getField(label))
      })
      expect(within(getCategoryGroup()).getAllByRole('button').map((chip) => chip.textContent)).toEqual(CATEGORY_LABELS)
      for (const buttonName of ['キャンセル', ...SAVE_BUTTON_NAMES]) {
        const button = screen.getByRole('button', { name: buttonName })
        expect(button).toBeInstanceOf(HTMLButtonElement)
        expect(button).toHaveAttribute('type', 'button')
      }
    })

    it("AC48: mode 'edit' with focusOnMount focuses the title スポットを編集", () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT, focusOnMount: true })

      const heading = screen.getByRole('heading', { level: 1, name: EDIT_TITLE })
      expect(heading).toHaveFocus()
      expect(heading).toHaveAttribute('tabindex', '-1')
    })

    it("AC48: mode 'edit' without focusOnMount does not move focus", () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      expect(document.body).toHaveFocus()
    })
  })

  describe('initialInput (AC42, AC45)', () => {
    it('AC42: fills every field with the saved values, line breaks included', () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      expect(getField(NAME_LABEL)).toHaveValue('大観山')
      expect(getField(REGION_LABEL)).toHaveValue('神奈川')
      expect(getField(DISTANCE_LABEL)).toHaveValue('60')
      expect(getField(EXIT_INTERCHANGE_LABEL)).toHaveValue('小田原西IC')
      expect(getField(SEASON_LABEL)).toHaveValue('紅葉の季節')
      expect(getField(MEMO_LABEL)).toHaveValue('一行目\n二行目')
    })

    it.each(CATEGORY_LABELS)('AC42: selects the saved category %s (and only it)', (category) => {
      renderFormWith({ mode: 'edit', initialInput: { ...SAVED_INPUT, category: category as SpotInput['category'] } })

      expectOnlyCategorySelected(category)
    })

    it('AC42: empty saved values open as empty fields that show their placeholders', () => {
      renderFormWith({
        mode: 'edit',
        initialInput: { ...SAVED_INPUT, region: '', distanceKm: '', exitInterchange: '', season: '', memo: '' },
      })

      expect(getField(REGION_LABEL)).toHaveValue('')
      expect(getField(REGION_LABEL)).toHaveAttribute('placeholder', '例：神奈川')
      expect(getField(DISTANCE_LABEL)).toHaveValue('')
      expect(getField(EXIT_INTERCHANGE_LABEL)).toHaveValue('')
      expect(getField(EXIT_INTERCHANGE_LABEL)).toHaveAttribute('placeholder', '例：小田原西IC')
      expect(getField(SEASON_LABEL)).toHaveValue('')
      expect(getField(MEMO_LABEL)).toHaveValue('')
    })

    it('AC42: shows no error when it opens', () => {
      renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      expect(screen.queryByText(NAME_REQUIRED_MESSAGE)).not.toBeInTheDocument()
      expect(screen.queryByText(DISTANCE_INVALID_MESSAGE)).not.toBeInTheDocument()
      for (const label of TEXT_FIELD_LABELS_IN_ORDER) {
        expect(getField(label)).not.toBeInvalid()
      }
    })

    it.each(SAVE_BUTTON_NAMES)('AC43: %s without any change calls onSave once with the initial input', async (saveButtonName) => {
      const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })

      await user.click(screen.getByRole('button', { name: saveButtonName }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(SAVED_INPUT)
    })

    it.each(SAVE_BUTTON_NAMES)('AC43: %s passes every field exactly as edited (untrimmed; updateSpot trims)', async (saveButtonName) => {
      const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await replaceFieldText(user, NAME_LABEL, ' 大観山（椿ライン） ')
      await user.click(within(getCategoryGroup()).getByRole('button', { name: '峠' }))
      await replaceFieldText(user, REGION_LABEL, '')
      await replaceFieldText(user, DISTANCE_LABEL, '75.5')
      await replaceFieldText(user, EXIT_INTERCHANGE_LABEL, '　湯河原IC ')
      await replaceFieldText(user, SEASON_LABEL, '')
      await replaceFieldText(user, MEMO_LABEL, '一行目{Enter}{Enter}三行目 ')

      await user.click(screen.getByRole('button', { name: saveButtonName }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        name: ' 大観山（椿ライン） ',
        region: '',
        category: '峠',
        distanceKm: '75.5',
        exitInterchange: '　湯河原IC ',
        season: '',
        memo: '一行目\n\n三行目 ',
      } satisfies SpotInput)
    })

    it('AC45: initialInput is used once: re-rendering with another initialInput keeps what is typed and shown', async () => {
      const { user, rerenderWith } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await replaceFieldText(user, NAME_LABEL, '打ちかけの名前')

      rerenderWith({
        initialInput: {
          name: '別のタブで変えた名前',
          region: '静岡',
          category: '海沿い',
          distanceKm: '999',
          exitInterchange: '沼津IC',
          season: '夏',
          memo: '別のタブで書いたメモ',
        },
      })

      expect(getField(NAME_LABEL)).toHaveValue('打ちかけの名前')
      expect(getField(REGION_LABEL)).toHaveValue('神奈川')
      expect(getField(DISTANCE_LABEL)).toHaveValue('60')
      expect(getField(EXIT_INTERCHANGE_LABEL)).toHaveValue('小田原西IC')
      expect(getField(SEASON_LABEL)).toHaveValue('紅葉の季節')
      expect(getField(MEMO_LABEL)).toHaveValue('一行目\n二行目')
      expectOnlyCategorySelected('絶景ロード')
    })

    it('AC45: after such a re-render, saving still sends what the screen shows', async () => {
      const { user, onSave, rerenderWith } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await replaceFieldText(user, EXIT_INTERCHANGE_LABEL, '湯河原IC')
      rerenderWith({ initialInput: { ...SAVED_INPUT, memo: '別のタブで書いたメモ', exitInterchange: '沼津IC' } })

      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).toHaveBeenCalledWith({ ...SAVED_INPUT, exitInterchange: '湯河原IC' })
    })

    it('does not mutate initialInput while typing', async () => {
      const initialInput = Object.freeze({ ...SAVED_INPUT })
      const { user } = renderFormWith({ mode: 'edit', initialInput })

      await user.type(getField(NAME_LABEL), '（椿ライン）')
      await user.click(within(getCategoryGroup()).getByRole('button', { name: '峠' }))

      expect(initialInput).toEqual(SAVED_INPUT)
      expect(getField(NAME_LABEL)).toHaveValue('大観山（椿ライン）')
    })
  })

  describe('edit mode: validation and cancel (AC43, AC44, AC48)', () => {
    it.each(SAVE_BUTTON_NAMES)(
      `AC43/AC48: %s with the name cleared shows '${NAME_REQUIRED_MESSAGE}', does not save and focuses the name`,
      async (saveButtonName) => {
        const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
        await user.clear(getField(NAME_LABEL))

        await user.click(screen.getByRole('button', { name: saveButtonName }))

        expect(onSave).not.toHaveBeenCalled()
        expect(getField(NAME_LABEL)).toHaveAccessibleDescription(NAME_REQUIRED_MESSAGE)
        expect(getField(NAME_LABEL)).toHaveFocus()
        expect(screen.getByRole('heading', { level: 1, name: EDIT_TITLE })).toBeInTheDocument()
      },
    )

    it.each(SAVE_BUTTON_NAMES)(
      `AC43/AC48: %s with an invalid distance shows '${DISTANCE_INVALID_MESSAGE}', does not save and focuses the distance`,
      async (saveButtonName) => {
        const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
        await replaceFieldText(user, DISTANCE_LABEL, '1e3')

        await user.click(screen.getByRole('button', { name: saveButtonName }))

        expect(onSave).not.toHaveBeenCalled()
        expect(getField(DISTANCE_LABEL)).toHaveAccessibleDescription(DISTANCE_INVALID_MESSAGE)
        expect(getField(DISTANCE_LABEL)).toHaveFocus()
        expect(getField(NAME_LABEL)).not.toBeInvalid()
      },
    )

    it('AC43/AC48: with both errors, focuses the name (名前 → 距離 の順)', async () => {
      const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await replaceFieldText(user, NAME_LABEL, '　')
      await replaceFieldText(user, DISTANCE_LABEL, '-5')

      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(getField(NAME_LABEL)).toHaveAccessibleDescription(NAME_REQUIRED_MESSAGE)
      expect(getField(DISTANCE_LABEL)).toHaveAccessibleDescription(DISTANCE_INVALID_MESSAGE)
      expect(getField(NAME_LABEL)).toHaveFocus()
    })

    it('AC43/AC10: after fixing the name, saving calls onSave with the fixed input', async () => {
      const { user, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await user.clear(getField(NAME_LABEL))
      await user.click(screen.getByRole('button', { name: '保存する' }))

      await user.type(getField(NAME_LABEL), '大観山')
      await user.click(screen.getByRole('button', { name: '保存する' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(SAVED_INPUT)
    })

    it('AC44: キャンセル calls onCancel and never onSave, without asking for confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { user, onCancel, onSave } = renderFormWith({ mode: 'edit', initialInput: SAVED_INPUT })
      await replaceFieldText(user, NAME_LABEL, '捨てる名前')

      await user.click(screen.getByRole('button', { name: 'キャンセル' }))

      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
      expect(confirmSpy).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
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
