import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, type SelectOption } from './Select'

const mockOptions: SelectOption[] = [
  { value: 'food', label: '食費' },
  { value: 'transport', label: '交通費' },
  { value: 'rent', label: '家賃', disabled: true },
]

describe('Select', () => {
  // --- 基本表示 ---

  it('select 要素がレンダリングされる', () => {
    render(<Select options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  // --- option 表示 ---

  it('全ての option が表示される', () => {
    render(<Select options={mockOptions} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('食費')
    expect(options[1]).toHaveTextContent('交通費')
    expect(options[2]).toHaveTextContent('家賃')
  })

  it('disabled な option は disabled 属性を持つ', () => {
    render(<Select options={mockOptions} />)
    const rentOption = screen.getByRole('option', { name: '家賃' })
    expect(rentOption).toBeDisabled()
  })

  // --- placeholder ---

  it('placeholder が最初の option として表示される', () => {
    render(<Select options={mockOptions} placeholder="カテゴリを選択" />)
    const options = screen.getAllByRole('option')
    // placeholder + 3 options = 4
    expect(options).toHaveLength(4)
    expect(options[0]).toHaveTextContent('カテゴリを選択')
    expect(options[0]).toBeDisabled()
  })

  // --- 選択 ---

  it('option を選択できる', async () => {
    const user = userEvent.setup()
    render(<Select options={mockOptions} />)
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'transport')
    expect(select).toHaveValue('transport')
  })

  it('onChange ハンドラが呼ばれる', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Select options={mockOptions} onChange={handleChange} />)
    await user.selectOptions(screen.getByRole('combobox'), 'food')
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  // --- label ---

  it('label が表示され select と紐づく', () => {
    render(<Select label="カテゴリ" id="category" options={mockOptions} />)
    const select = screen.getByLabelText('カテゴリ')
    expect(select).toBeInTheDocument()
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    render(<Select options={mockOptions} className="mt-4" />)
    expect(screen.getByRole('combobox').className).toContain('mt-4')
  })
})
