import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Ingredient } from '@/lib/domain'
import { IngredientPicker } from './IngredientPicker'

function ing(id: string, name: string): Ingredient {
  return {
    id,
    name,
    purchasePriceExTax: 100,
    inputPrice: 108,
    priceIncludesTax: true,
    taxRate: 8,
    purchaseQuantity: 100,
    unit: 'g',
    dimension: 'weight',
    yieldPercent: 100,
    isSample: false,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
  }
}

const ingredients = [ing('i1', '鶏もも'), ing('i2', 'キャベツ'), ing('i3', '小麦粉')]

describe('IngredientPicker', () => {
  it('shows the placeholder when nothing is selected and opens the listbox', async () => {
    render(<IngredientPicker ingredients={ingredients} value={null} onChange={() => {}} />)
    const combo = screen.getByRole('combobox', { name: '食材' })
    expect(combo).toHaveTextContent('食材を選択')
    await userEvent.click(combo)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('filters options by the search query and selects one', async () => {
    const onChange = vi.fn()
    render(<IngredientPicker ingredients={ingredients} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox', { name: '食材' }))
    await userEvent.type(screen.getByRole('textbox', { name: '食材を検索' }), 'キャベ')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.click(screen.getByRole('option', { name: 'キャベツ' }))
    expect(onChange).toHaveBeenCalledWith('i2')
    // closes after selection
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows the selected ingredient name', () => {
    render(<IngredientPicker ingredients={ingredients} value="i1" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: '食材' })).toHaveTextContent('鶏もも')
  })
})
