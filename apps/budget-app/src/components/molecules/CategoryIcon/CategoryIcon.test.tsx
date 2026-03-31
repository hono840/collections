import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CategoryIcon, ICON_MAP } from './CategoryIcon'

describe('CategoryIcon', () => {
  it('指定されたアイコン名でアイコンが表示される', () => {
    const { container } = render(<CategoryIcon name="utensils" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('不明なアイコン名の場合はフォールバック (Circle) が表示される', () => {
    const { container } = render(<CategoryIcon name="unknown-icon" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('color prop が style に反映される', () => {
    const { container } = render(
      <CategoryIcon name="utensils" color="#ff0000" />
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveStyle({ color: '#ff0000' })
  })

  it('color が未指定の場合は style が設定されない', () => {
    const { container } = render(<CategoryIcon name="utensils" />)
    const svg = container.querySelector('svg')
    expect(svg?.style.color).toBe('')
  })

  it('size prop が反映される', () => {
    const { container } = render(<CategoryIcon name="utensils" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
  })

  it('デフォルト size は 20', () => {
    const { container } = render(<CategoryIcon name="utensils" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '20')
    expect(svg).toHaveAttribute('height', '20')
  })

  it('className prop が適用される', () => {
    const { container } = render(
      <CategoryIcon name="utensils" className="custom-class" />
    )
    const svg = container.querySelector('svg')
    expect(svg?.classList.contains('custom-class')).toBe(true)
  })

  it('ICON_MAP に主要なアイコンが含まれている', () => {
    expect(ICON_MAP).toHaveProperty('utensils')
    expect(ICON_MAP).toHaveProperty('car')
    expect(ICON_MAP).toHaveProperty('home')
    expect(ICON_MAP).toHaveProperty('coffee')
  })
})
