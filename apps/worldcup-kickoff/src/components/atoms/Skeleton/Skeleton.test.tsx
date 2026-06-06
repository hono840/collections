import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('pulse アニメーションが付与される', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild?.className).toContain('animate-pulse')
  })

  it('装飾要素として aria-hidden が付与される', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden')
  })

  it('デフォルト shape (text) のスタイルが適用される', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild?.className).toContain('h-4')
  })

  it('circle shape のスタイルが適用される', () => {
    const { container } = render(<Skeleton shape="circle" />)
    expect(container.firstElementChild?.className).toContain('rounded-full')
  })

  it('rect shape のスタイルが適用される', () => {
    const { container } = render(<Skeleton shape="rect" />)
    expect(container.firstElementChild?.className).toContain('rounded-2xl')
  })

  it('追加の className がマージされる（サイズ上書き）', () => {
    const { container } = render(<Skeleton className="h-20 w-20" />)
    expect(container.firstElementChild?.className).toContain('h-20')
  })
})
