import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RatingInput } from './RatingInput'

// RatingInput (architecture 2.1 / US-03; UX 6 "評価の入力（縮尺バー）"; design spec 4-2). Client molecule.
// Contract:
//   RatingInput({ name: string; legend: string; labels: readonly [string, string, string, string, string];
//                 value: number | null; onChange(value: number | null): void;
//                 required?: boolean; error?: string; id?: string; className? })
//   - role="radiogroup" named by the legend; aria-required="true" when required; "必須" shown as text
//   - 5 cells in order, each role="radio" (native radio or ARIA radio) named "N、<word>" e.g. "4、良い"
//   - one tab stop; arrow keys move AND select (APG radio group), wrapping at the ends
//   - status line "選択中: 4（良い）" / "選択中: 未選択" in an aria-live="polite" region
//     (this is the "aria-valuetext" of the brief: radios have no aria-valuetext, UX 6 specifies this text)
//   - optional axis: "選択を解除" button only while a value is selected -> onChange(null), focus back to
//     the first cell and "選択を解除しました" announced. Required axis: never a clear button.
//   - error: message shown, radiogroup aria-invalid="true" and described by the message
//   - a scale bar, not stars

const OVERALL_LABELS = ['いまひとつ', 'やや物足りない', 'ふつう', '良い', 'とても良い'] as const

function Harness({
  initial = null,
  required = false,
  error,
  onChange = vi.fn(),
  legend = '景観',
}: {
  initial?: number | null
  required?: boolean
  error?: string
  onChange?: (value: number | null) => void
  legend?: string
}) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <>
      <button type="button">before</button>
      <RatingInput
        name={`rating-${legend}`}
        legend={legend}
        labels={OVERALL_LABELS}
        value={value}
        required={required}
        error={error}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
      <button type="button">after</button>
    </>
  )
}

function group(name: RegExp | string = /景観/) {
  return screen.getByRole('radiogroup', { name })
}

function isSelected(radio: HTMLElement) {
  return (radio as HTMLInputElement).checked === true || radio.getAttribute('aria-checked') === 'true'
}

describe('RatingInput: structure', () => {
  it('is a radiogroup named by the legend with 5 radios "N、word" in order', () => {
    render(<Harness />)
    const radios = within(group()).getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('aria-label') ?? radio.textContent ?? '')).toHaveLength(5)
    expect(within(group()).getByRole('radio', { name: '1、いまひとつ' })).toBe(radios[0])
    expect(within(group()).getByRole('radio', { name: '2、やや物足りない' })).toBe(radios[1])
    expect(within(group()).getByRole('radio', { name: '3、ふつう' })).toBe(radios[2])
    expect(within(group()).getByRole('radio', { name: '4、良い' })).toBe(radios[3])
    expect(within(group()).getByRole('radio', { name: '5、とても良い' })).toBe(radios[4])
  })

  it('shows the numbers 1..5 as text and no stars', () => {
    const { container } = render(<Harness />)
    const text = container.textContent ?? ''
    for (const number of ['1', '2', '3', '4', '5']) expect(text).toContain(number)
    expect(text).not.toMatch(/[★☆⭐]/)
  })

  it('nothing is selected for null and the status says 未選択', () => {
    render(<Harness />)
    for (const radio of within(group()).getAllByRole('radio')) expect(isSelected(radio)).toBe(false)
    expect(screen.getByText(/選択中: 未選択/)).toBeInTheDocument()
  })

  it('reflects the value and states it as "選択中: 4（良い）" in a polite live region', () => {
    render(<Harness initial={4} />)
    expect(isSelected(screen.getByRole('radio', { name: '4、良い' }))).toBe(true)
    const status = screen.getByText('選択中: 4（良い）')
    expect(status.closest('[aria-live="polite"]')).not.toBeNull()
  })
})

describe('RatingInput: pointer and keyboard', () => {
  it('clicking a cell selects it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '3、ふつう' }))

    expect(onChange).toHaveBeenLastCalledWith(3)
    expect(screen.getByText('選択中: 3（ふつう）')).toBeInTheDocument()
  })

  it('Tab enters the group at the selected cell and the next Tab leaves the group (one tab stop)', async () => {
    const user = userEvent.setup()
    render(<Harness initial={3} />)

    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: '3、ふつう' })).toHaveFocus()
    await user.tab()
    // The next stop is outside the 5 cells (the 選択を解除 button or whatever follows).
    for (const radio of within(group()).getAllByRole('radio')) expect(radio).not.toHaveFocus()
  })

  it('a required group without a clear button is a single tab stop between its neighbours', async () => {
    const user = userEvent.setup()
    render(<Harness initial={2} required legend="総合" />)
    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: '2、やや物足りない' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
  })

  it('Tab enters at the first cell when nothing is selected', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: '1、いまひとつ' })).toHaveFocus()
  })

  it('ArrowRight / ArrowDown move to and select the next cell; ArrowLeft / ArrowUp the previous one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith(4)
    expect(screen.getByRole('radio', { name: '4、良い' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith(5)

    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith(4)

    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(3)
    expect(screen.getByText('選択中: 3（ふつう）')).toBeInTheDocument()
  })

  it('wraps around at the ends (5 -> 1, 1 -> 5)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={5} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith(1)
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith(5)
  })
})

describe('RatingInput: required (総合)', () => {
  it('marks the group as required with aria-required and the text 必須', () => {
    render(<Harness required legend="総合" />)
    const radiogroup = group(/総合/)
    expect(radiogroup).toHaveAttribute('aria-required', 'true')
    expect(within(radiogroup).getByText('必須')).toBeInTheDocument()
  })

  it('never offers "選択を解除" (総合 is required)', async () => {
    const user = userEvent.setup()
    render(<Harness required legend="総合" />)
    expect(screen.queryByRole('button', { name: '選択を解除' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '4、良い' }))
    expect(screen.queryByRole('button', { name: '選択を解除' })).not.toBeInTheDocument()
  })

  it('shows the error under the group and links it (aria-invalid + description)', () => {
    render(<Harness required legend="総合" error="総合評価を選んでください" />)
    const radiogroup = group(/総合/)
    expect(screen.getByText('総合評価を選んでください')).toBeInTheDocument()
    expect(radiogroup).toHaveAttribute('aria-invalid', 'true')
    expect(radiogroup).toHaveAccessibleDescription(expect.stringContaining('総合評価を選んでください'))
  })

  it('without an error the group is not marked invalid', () => {
    render(<Harness required legend="総合" />)
    expect(group(/総合/)).not.toHaveAttribute('aria-invalid', 'true')
  })
})

describe('RatingInput: optional axis "選択を解除"', () => {
  it('has no clear button while nothing is selected', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: '選択を解除' })).not.toBeInTheDocument()
  })

  it('appears after selecting; pressing it clears, moves focus to the first cell and announces it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '2、やや物足りない' }))
    await user.click(screen.getByRole('button', { name: '選択を解除' }))

    expect(onChange).toHaveBeenLastCalledWith(null)
    for (const radio of within(group()).getAllByRole('radio')) expect(isSelected(radio)).toBe(false)
    await waitFor(() => expect(screen.getByRole('radio', { name: '1、いまひとつ' })).toHaveFocus())
    expect(screen.getByText('選択を解除しました')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '選択を解除' })).not.toBeInTheDocument()
  })

  it('the clear button is a real button (type="button", never submits a form)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Harness initial={2} />
      </form>,
    )
    await user.click(screen.getByRole('button', { name: '選択を解除' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
