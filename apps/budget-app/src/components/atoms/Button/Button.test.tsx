import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  // --- 表示テスト ---

  it('children が正しく表示される', () => {
    render(<Button>保存</Button>)
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('デフォルトバリアント (primary) のスタイルが適用される', () => {
    render(<Button>テスト</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-brand-600')
  })

  it('secondary バリアントのスタイルが適用される', () => {
    render(<Button variant="secondary">テスト</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-white')
  })

  it('ghost バリアントのスタイルが適用される', () => {
    render(<Button variant="ghost">テスト</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-slate-600')
  })

  it('danger バリアントのスタイルが適用される', () => {
    render(<Button variant="danger">テスト</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-red-600')
  })

  // --- サイズテスト ---

  it('sm サイズのスタイルが適用される', () => {
    render(<Button size="sm">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('px-3')
  })

  it('lg サイズのスタイルが適用される', () => {
    render(<Button size="lg">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('py-3')
  })

  // --- fullWidth ---

  it('fullWidth が true の場合 w-full クラスが付与される', () => {
    render(<Button fullWidth>テスト</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  // --- インタラクション ---

  it('クリック時に onClick ハンドラが呼ばれる', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>クリック</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // --- disabled ---

  it('disabled の場合クリックしても onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>無効</Button>)

    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  // --- loading ---

  it('loading 中はボタンが disabled になる', () => {
    render(<Button loading>読込中</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('loading 中はスピナー (Loader2) が表示される', () => {
    render(<Button loading>読込中</Button>)
    // Loader2 は animate-spin クラスを持つ svg をレンダーする
    const btn = screen.getByRole('button')
    const spinner = btn.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('loading でない場合はスピナーが表示されない', () => {
    render(<Button>通常</Button>)
    const btn = screen.getByRole('button')
    const spinner = btn.querySelector('.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    render(<Button className="mt-4">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('mt-4')
  })
})
