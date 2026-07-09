import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Ingredient } from '@/lib/domain'
import { IngredientListPanel } from './IngredientListPanel'

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'chicken',
    name: '鶏もも肉',
    purchasePriceExTax: 900,
    inputPrice: 900,
    priceIncludesTax: false,
    taxRate: 8,
    purchaseQuantity: 1000,
    unit: 'g',
    dimension: 'weight',
    yieldPercent: 90,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const BASE = {
  query: '',
  onQueryChange: () => {},
  sort: 'name-asc',
  onSortChange: () => {},
  onEdit: () => {},
  onAdd: () => {},
}

describe('IngredientListPanel', () => {
  it('shows the live 有効単価 for each ingredient', () => {
    render(<IngredientListPanel {...BASE} ingredients={[ingredient()]} onQuickEditPrice={() => {}} />)
    // 900 / (1000 * 0.9) = 1.0/g
    expect(screen.getByText('¥1/g')).toBeInTheDocument()
  })

  it('commits an inline purchase-price edit through onQuickEditPrice (THE WEDGE)', async () => {
    const onQuickEditPrice = vi.fn()
    render(<IngredientListPanel {...BASE} ingredients={[ingredient()]} onQuickEditPrice={onQuickEditPrice} />)

    const input = screen.getByLabelText('鶏もも肉の購入価格')
    await userEvent.clear(input)
    await userEvent.type(input, '1200')
    expect(onQuickEditPrice).toHaveBeenLastCalledWith('chicken', 1200)
  })

  it('opens edit / add', async () => {
    const onEdit = vi.fn()
    const onAdd = vi.fn()
    render(<IngredientListPanel {...BASE} ingredients={[ingredient()]} onQuickEditPrice={() => {}} onEdit={onEdit} onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: '鶏もも肉を編集' }))
    expect(onEdit).toHaveBeenCalledWith('chicken')
    await userEvent.click(screen.getByRole('button', { name: '食材を追加' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('renders the empty state and a sample-seed CTA when there are no ingredients', async () => {
    const onSeedSample = vi.fn()
    render(<IngredientListPanel {...BASE} ingredients={[]} onQuickEditPrice={() => {}} onSeedSample={onSeedSample} />)
    expect(screen.getByText('食材がありません')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'サンプル食材を入れる' }))
    expect(onSeedSample).toHaveBeenCalledOnce()
  })

  it('shows the SampleDataBanner while samples exist', () => {
    render(
      <IngredientListPanel
        {...BASE}
        ingredients={[ingredient({ isSample: true })]}
        onQuickEditPrice={() => {}}
        hasSamples
        onClearSamples={() => {}}
      />,
    )
    expect(screen.getByText('これはサンプルです')).toBeInTheDocument()
  })
})
