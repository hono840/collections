import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('div 要素がレンダリングされる', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('animate-pulse クラスが適用される', () => {
    const { container } = render(<Skeleton />)
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse')
  })

  it('rounded-lg クラスが適用される', () => {
    const { container } = render(<Skeleton />)
    expect((container.firstChild as HTMLElement).className).toContain('rounded-lg')
  })

  it('追加の className がマージされる', () => {
    const { container } = render(<Skeleton className="h-8 w-32" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('w-32')
  })
})
