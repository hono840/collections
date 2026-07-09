import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Ingredient, RecipeItem } from '@/lib/domain'
import { RecipeLineRow } from './RecipeLineRow'

function makeIngredient(over: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'chicken',
    name: '鶏もも',
    purchasePriceExTax: 1000,
    inputPrice: 1000,
    priceIncludesTax: false,
    taxRate: 8,
    purchaseQuantity: 1,
    unit: 'kg',
    dimension: 'weight',
    yieldPercent: 100,
    isSample: false,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    ...over,
  }
}

describe('RecipeLineRow', () => {
  it('offers only units compatible with the ingredient dimension (weight -> g/kg)', () => {
    const ingredient = makeIngredient() // weight, kg
    const line: RecipeItem = { ingredientId: 'chicken', quantity: 100, unit: 'g' }
    render(<RecipeLineRow line={line} ingredients={[ingredient]} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByRole('option', { name: 'g' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'kg' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'ml' })).toBeNull()
    expect(screen.queryByRole('option', { name: '個' })).toBeNull()
  })

  it('restricts a count ingredient to its own unit only', () => {
    const ingredient = makeIngredient({ unit: '個', dimension: 'count', purchaseQuantity: 10 })
    const line: RecipeItem = { ingredientId: 'chicken', quantity: 2, unit: '個' }
    render(<RecipeLineRow line={line} ingredients={[ingredient]} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByRole('option', { name: '個' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'g' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'kg' })).toBeNull()
  })

  it('computes the line cost (100g of ￥1000/kg = ￥100)', () => {
    const ingredient = makeIngredient() // ￥1000 / kg ex-tax, yield 100%
    const line: RecipeItem = { ingredientId: 'chicken', quantity: 100, unit: 'g' }
    render(<RecipeLineRow line={line} ingredients={[ingredient]} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('￥100')).toBeInTheDocument()
  })

  it('flags a missing ingredient with an inline message and 「—」 cost', () => {
    const line: RecipeItem = { ingredientId: 'ghost', quantity: 100, unit: 'g' }
    render(<RecipeLineRow line={line} ingredients={[]} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('食材が見つかりません')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('flags a unit mismatch', () => {
    const ingredient = makeIngredient() // weight
    const line: RecipeItem = { ingredientId: 'chicken', quantity: 2, unit: '個' } // incompatible
    render(<RecipeLineRow line={line} ingredients={[ingredient]} onChange={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('単位が一致しません')).toBeInTheDocument()
  })

  it('removes the line', async () => {
    const onRemove = vi.fn()
    const line: RecipeItem = { ingredientId: 'chicken', quantity: 100, unit: 'g' }
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<RecipeLineRow line={line} ingredients={[makeIngredient()]} onChange={() => {}} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'この材料を削除' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
