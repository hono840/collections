import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IngredientForm } from './IngredientForm'

describe('IngredientForm', () => {
  it('submits validated values with the derived dimension', async () => {
    const onSubmit = vi.fn()
    render(<IngredientForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: '食材名' }), '鶏もも肉')
    await userEvent.type(screen.getByRole('textbox', { name: '購入価格' }), '1080')
    await userEvent.type(screen.getByRole('textbox', { name: '購入量' }), '100')
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      name: '鶏もも肉',
      inputPrice: 1080,
      priceIncludesTax: true,
      taxRate: 8,
      purchaseQuantity: 100,
      unit: 'g',
      dimension: 'weight',
      yieldPercent: 100,
    })
  })

  it('blocks submit and shows inline errors for empty required fields', async () => {
    const onSubmit = vi.fn()
    render(<IngredientForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('食材名を入力してください')).toBeInTheDocument()
    expect(screen.getByText('購入価格を入力してください')).toBeInTheDocument()
    expect(screen.getByText('購入量を入力してください')).toBeInTheDocument()
  })

  it('rejects a zero yield (zero-division guard) with a message', async () => {
    const onSubmit = vi.fn()
    render(<IngredientForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: '食材名' }), '油')
    await userEvent.type(screen.getByRole('textbox', { name: '購入価格' }), '100')
    await userEvent.type(screen.getByRole('textbox', { name: '購入量' }), '100')
    const yieldInput = screen.getByRole('textbox', { name: '歩留まり率' })
    await userEvent.clear(yieldInput)
    await userEvent.type(yieldInput, '0')
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('歩留まり率は1以上で入力してください')).toBeInTheDocument()
  })

  it('shows the live 有効単価 (税込1080 / 8% ÷ 100g ÷ 歩留100% = 10 円/g)', async () => {
    render(<IngredientForm onSubmit={() => {}} />)
    await userEvent.type(screen.getByRole('textbox', { name: '購入価格' }), '1080')
    await userEvent.type(screen.getByRole('textbox', { name: '購入量' }), '100')
    expect(screen.getByText('有効単価')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('円/g')).toBeInTheDocument()
  })

  it('supports cancel', async () => {
    const onCancel = vi.fn()
    render(<IngredientForm onSubmit={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
