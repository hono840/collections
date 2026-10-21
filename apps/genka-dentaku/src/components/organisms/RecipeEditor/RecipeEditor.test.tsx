import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Ingredient, Menu, MenuSummary } from '@/lib/domain'
import { RecipeEditor } from './RecipeEditor'

const CHICKEN: Ingredient = {
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
}

const MENU: Menu = {
  id: 'karaage',
  name: '唐揚げ定食',
  sellPriceExTax: 818,
  sellInputPrice: 900,
  sellPriceIncludesTax: true,
  sellTaxRate: 10,
  items: [{ ingredientId: 'chicken', quantity: 150, unit: 'g' }],
  isSample: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SUMMARY: MenuSummary = {
  menu: MENU,
  costExTax: 150,
  costYen: 150,
  sellExTax: 818,
  sellIncTax: 900,
  rate: 0.183,
  ratePercent1: 18.3,
  marginExTax: 668,
  status: 'good',
  issues: [],
  needsAttention: false,
}

const HANDLERS = {
  onChangeName: vi.fn(),
  onChangeSell: vi.fn(),
  onAddLine: vi.fn(),
  onChangeLine: vi.fn(),
  onRemoveLine: vi.fn(),
  onSimulate: vi.fn(),
  onDelete: vi.fn(),
}

function renderEditor(extra: Partial<React.ComponentProps<typeof RecipeEditor>> = {}) {
  return render(
    <RecipeEditor menu={MENU} summary={SUMMARY} ingredients={[CHICKEN]} warn={30} danger={35} {...HANDLERS} {...extra} />,
  )
}

describe('RecipeEditor', () => {
  it('renders the name, sell price and the live cost summary', () => {
    renderEditor()
    expect(screen.getByRole('textbox', { name: 'メニュー名' })).toHaveValue('唐揚げ定食')
    expect(screen.getByRole('textbox', { name: '売価' })).toHaveValue('900')
    expect(screen.getAllByText('18.3%').length).toBeGreaterThanOrEqual(1) // LiveCostSummary rate (hero + pill)
    expect(screen.getByText('値上げをシミュレーション')).toBeInTheDocument()
  })

  it('edits the menu name', () => {
    const onChangeName = vi.fn()
    renderEditor({ onChangeName })
    fireEvent.change(screen.getByRole('textbox', { name: 'メニュー名' }), { target: { value: '鶏の唐揚げ' } })
    expect(onChangeName).toHaveBeenCalledWith('鶏の唐揚げ')
  })

  it('adds a material line via the ingredient picker', async () => {
    const onAddLine = vi.fn()
    renderEditor({ onAddLine })
    await userEvent.click(screen.getByRole('combobox', { name: '材料を追加' }))
    await userEvent.click(screen.getByRole('option', { name: '鶏もも肉' }))
    expect(onAddLine).toHaveBeenCalledWith('chicken')
  })

  it('confirms before deleting and triggers simulate', async () => {
    const onDelete = vi.fn()
    const onSimulate = vi.fn()
    renderEditor({ onDelete, onSimulate })

    await userEvent.click(screen.getByRole('button', { name: '値上げをシミュレーション' }))
    expect(onSimulate).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'メニューを削除' }))
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
