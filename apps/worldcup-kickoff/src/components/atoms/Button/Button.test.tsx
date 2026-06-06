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
    expect(screen.getByRole('button').className).toContain('bg-pitch-600')
  })

  it('secondary バリアントのスタイルが適用される', () => {
    render(<Button variant="secondary">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('bg-surface')
  })

  it('ghost バリアントのスタイルが適用される', () => {
    render(<Button variant="ghost">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('text-text-muted')
  })

  it('danger バリアントのスタイルが適用される', () => {
    render(<Button variant="danger">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('bg-kickoff-500')
  })

  // --- サイズテスト ---

  it('sm サイズのスタイルが適用される', () => {
    render(<Button size="sm">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('px-4')
  })

  it('lg サイズのスタイルが適用される', () => {
    render(<Button size="lg">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('py-3')
  })

  it('全サイズでタップ領域 44px 以上（min-h-11 以上）が保証される', () => {
    const { rerender } = render(<Button size="sm">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('min-h-11')
    rerender(<Button size="lg">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('min-h-12')
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

  it('disabled の場合クリックしても onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        無効
      </Button>,
    )
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

  it('loading 中は aria-busy が付与される', () => {
    render(<Button loading>読込中</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('loading 中はスピナー (Loader2) が表示される', () => {
    render(<Button loading>読込中</Button>)
    const spinner = screen.getByRole('button').querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('loading でない場合はスピナーが表示されない', () => {
    render(<Button>通常</Button>)
    const spinner = screen.getByRole('button').querySelector('.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    render(<Button className="mt-4">テスト</Button>)
    expect(screen.getByRole('button').className).toContain('mt-4')
  })
})
