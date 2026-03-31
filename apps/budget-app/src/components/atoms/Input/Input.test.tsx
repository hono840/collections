import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  // --- 基本表示 ---

  it('input 要素がレンダリングされる', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  // --- label ---

  it('label が表示され input と紐づく', () => {
    render(<Input label="メールアドレス" id="email" />)
    const input = screen.getByLabelText('メールアドレス')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'email')
  })

  it('label が未指定の場合は label 要素が表示されない', () => {
    render(<Input id="test" />)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  // --- 入力テスト ---

  it('値を入力できる', async () => {
    const user = userEvent.setup()
    render(<Input />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'テスト入力')
    expect(input).toHaveValue('テスト入力')
  })

  it('onChange ハンドラが呼ばれる', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    await user.type(screen.getByRole('textbox'), 'a')
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  // --- エラー表示 ---

  it('エラーメッセージが表示される', () => {
    render(<Input error="必須項目です" />)
    expect(screen.getByText('必須項目です')).toBeInTheDocument()
  })

  it('エラー時にエラースタイルが適用される', () => {
    render(<Input error="エラー" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-red-500')
  })

  it('エラーがない場合はエラーメッセージが表示されない', () => {
    render(<Input />)
    // エラー用 p 要素がないことを確認
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  // --- placeholder ---

  it('placeholder が表示される', () => {
    render(<Input placeholder="入力してください" />)
    expect(screen.getByPlaceholderText('入力してください')).toBeInTheDocument()
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    render(<Input className="mt-4" />)
    expect(screen.getByRole('textbox').className).toContain('mt-4')
  })
})
