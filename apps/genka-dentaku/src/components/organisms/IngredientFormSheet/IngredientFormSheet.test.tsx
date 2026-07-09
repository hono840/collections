import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { IngredientFormValues } from '@/components/molecules/IngredientForm'
import { IngredientFormSheet } from './IngredientFormSheet'

const INITIAL: Partial<IngredientFormValues> = {
  name: '鶏もも肉',
  inputPrice: 900,
  priceIncludesTax: false,
  taxRate: 8,
  purchaseQuantity: 1000,
  unit: 'g',
  yieldPercent: 90,
}

describe('IngredientFormSheet', () => {
  it('submits the edited ingredient with its derived dimension', async () => {
    const onSubmit = vi.fn()
    render(
      <IngredientFormSheet open onClose={() => {}} editingId="chicken" initial={INITIAL} onSubmit={onSubmit} />,
    )
    expect(screen.getByRole('heading', { name: '食材を編集' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: '鶏もも肉', dimension: 'weight' }))
  })

  it('confirms deletion and states how many menus use the ingredient', async () => {
    const onDelete = vi.fn()
    render(
      <IngredientFormSheet
        open
        onClose={() => {}}
        editingId="chicken"
        initial={INITIAL}
        usedByMenuCount={2}
        onSubmit={() => {}}
        onDelete={onDelete}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'この食材を削除' }))
    expect(screen.getByText(/2件のメニューで使用中です/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    expect(onDelete).toHaveBeenCalledWith('chicken')
  })

  it('has no delete affordance when adding a new ingredient', () => {
    render(<IngredientFormSheet open onClose={() => {}} editingId={null} onSubmit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('heading', { name: '食材を追加' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この食材を削除' })).not.toBeInTheDocument()
  })
})
