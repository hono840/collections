import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DeskDecor } from './DeskDecor'

describe('DeskDecor', () => {
  it('ルートは aria-hidden の純装飾である', () => {
    const { container } = render(<DeskDecor />)
    const root = container.firstElementChild as HTMLElement
    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('aria-hidden')
  })

  it('読み上げ・操作対象になる role を持たない（純装飾）', () => {
    const { container } = render(<DeskDecor />)
    // ボタン・リンク等のインタラクティブ要素を持たない
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    // SVG は presentation（装飾）扱い。それ以外の意味のある role は付与しない
    const rolefulButNotPresentation = Array.from(
      container.querySelectorAll('[role]'),
    ).filter((el) => el.getAttribute('role') !== 'presentation')
    expect(rolefulButNotPresentation).toHaveLength(0)
  })

  it('装飾用 SVG（presentation）が描画される', () => {
    const { container } = render(<DeskDecor />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
    // SVG は presentation（読み上げ対象外の装飾）として描画される
    expect(
      container.querySelector('svg[role="presentation"]'),
    ).not.toBeNull()
  })

  it('className を root にマージできる', () => {
    const { container } = render(<DeskDecor className="custom-decor" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('custom-decor')
  })
})
