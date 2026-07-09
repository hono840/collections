import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { NumberInput } from './NumberInput'

function Controlled({ initial = null as number | null, unit }: { initial?: number | null; unit?: string }) {
  const [v, setV] = useState<number | null>(initial)
  return (
    <>
      <NumberInput aria-label="購入価格" value={v} onChange={setV} unit={unit} />
      <output>{v === null ? 'null' : v}</output>
    </>
  )
}

describe('NumberInput', () => {
  it('sets inputMode=decimal for a mobile decimal keypad', () => {
    render(<NumberInput aria-label="量" value={null} onChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: '量' })).toHaveAttribute('inputmode', 'decimal')
  })

  it('emits parsed numbers, including decimals', async () => {
    render(<Controlled />)
    await userEvent.type(screen.getByRole('textbox', { name: '購入価格' }), '0.25')
    expect(screen.getByText('0.25')).toBeInTheDocument()
  })

  it('emits null when cleared', async () => {
    render(<Controlled initial={12} />)
    const input = screen.getByRole('textbox', { name: '購入価格' })
    await userEvent.clear(input)
    expect(screen.getByText('null')).toBeInTheDocument()
  })

  it('renders right-aligned tabular figures with a unit adornment', () => {
    render(<Controlled initial={1200} unit="円" />)
    const input = screen.getByRole('textbox', { name: '購入価格' })
    expect(input).toHaveClass('tabular-nums', 'text-right', 'font-num')
    expect(screen.getByText('円')).toBeInTheDocument()
  })
})
