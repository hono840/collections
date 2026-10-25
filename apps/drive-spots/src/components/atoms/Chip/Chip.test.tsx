import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'

const VARIANTS = ['filter', 'choice'] as const

describe('Chip', () => {
  it.each(VARIANTS)('AC18: the %s chip is a real <button type="button"> named by its label', (variant) => {
    render(<Chip label="絶景ロード" selected={false} onSelect={vi.fn()} variant={variant} />)

    const chip = screen.getByRole('button', { name: '絶景ロード' })
    expect(chip).toBeInstanceOf(HTMLButtonElement)
    expect(chip).toHaveAttribute('type', 'button')
  })

  it.each(VARIANTS)('AC3/AC9: a selected %s chip has aria-pressed="true"', (variant) => {
    render(<Chip label="峠" selected onSelect={vi.fn()} variant={variant} />)

    expect(screen.getByRole('button', { name: '峠' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each(VARIANTS)('AC3/AC9: an unselected %s chip has aria-pressed="false"', (variant) => {
    render(<Chip label="峠" selected={false} onSelect={vi.fn()} variant={variant} />)

    expect(screen.getByRole('button', { name: '峠' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('AC3: pressing the chip calls onSelect once', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Chip label="海沿い" selected={false} onSelect={onSelect} variant="filter" />)

    await user.click(screen.getByRole('button', { name: '海沿い' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('AC3: pressing an already selected chip still calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Chip label="すべて" selected onSelect={onSelect} variant="filter" />)

    await user.click(screen.getByRole('button', { name: 'すべて' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('AC18: works from the keyboard (Enter and Space)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Chip label="サーキット" selected={false} onSelect={onSelect} variant="choice" />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'サーキット' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('does not call onSelect just by rendering', () => {
    const onSelect = vi.fn()

    render(<Chip label="都市高速" selected onSelect={onSelect} variant="filter" />)

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('AC2/AC3: the selected and unselected chips look different', () => {
    const { rerender } = render(<Chip label="峠" selected={false} onSelect={vi.fn()} variant="filter" />)
    const unselectedClassName = screen.getByRole('button', { name: '峠' }).className

    rerender(<Chip label="峠" selected onSelect={vi.fn()} variant="filter" />)

    expect(screen.getByRole('button', { name: '峠' }).className).not.toBe(unselectedClassName)
  })
})
