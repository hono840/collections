import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CategoryChips } from './CategoryChips'

const FILTER_OPTIONS = ['すべて', '峠', '絶景ロード', '海沿い', 'サーキット', '都市高速'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

function renderChips(selected: FilterOption = 'すべて') {
  const onSelect = vi.fn()
  render(<CategoryChips options={FILTER_OPTIONS} selected={selected} onSelect={onSelect} label="種類で絞り込み" />)
  return { onSelect }
}

describe('CategoryChips', () => {
  it('AC3: is a group named by label', () => {
    renderChips()

    expect(screen.getByRole('group', { name: '種類で絞り込み' })).toBeInTheDocument()
  })

  it('AC3: renders one chip button per option, in the given order', () => {
    renderChips()

    const chips = within(screen.getByRole('group', { name: '種類で絞り込み' })).getAllByRole('button')
    expect(chips.map((chip) => chip.textContent)).toEqual([...FILTER_OPTIONS])
  })

  it('AC3: only the selected option has aria-pressed="true"; the others have "false"', () => {
    renderChips('海沿い')

    for (const option of FILTER_OPTIONS) {
      expect(screen.getByRole('button', { name: option })).toHaveAttribute(
        'aria-pressed',
        option === '海沿い' ? 'true' : 'false',
      )
    }
  })

  it.each(FILTER_OPTIONS)('AC3: pressing %s calls onSelect with that option', async (option) => {
    const user = userEvent.setup()
    const { onSelect } = renderChips('すべて')

    await user.click(screen.getByRole('button', { name: option }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(option)
  })

  it('AC18: the chips are reachable with Tab in order', async () => {
    const user = userEvent.setup()
    renderChips()

    await user.tab()
    expect(screen.getByRole('button', { name: 'すべて' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: '峠' })).toHaveFocus()
  })

  it('works with any list of string options', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CategoryChips options={['A', 'B']} selected="B" onSelect={onSelect} label="テスト" />)

    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'A' }))

    expect(onSelect).toHaveBeenCalledWith('A')
  })
})
