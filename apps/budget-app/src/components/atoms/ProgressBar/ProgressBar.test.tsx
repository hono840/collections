import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  // --- パーセンテージ表示 ---

  it('指定したパーセンテージの幅が設定される', () => {
    const { container } = render(<ProgressBar percentage={60} />)
    const bar = container.querySelector('[style]')
    expect(bar).toHaveStyle({ width: '60%' })
  })

  it('0% の場合は幅が 0% になる', () => {
    const { container } = render(<ProgressBar percentage={0} />)
    const bar = container.querySelector('[style]')
    expect(bar).toHaveStyle({ width: '0%' })
  })

  it('100% を超える場合は 100% にキャップされる', () => {
    const { container } = render(<ProgressBar percentage={150} />)
    const bar = container.querySelector('[style]')
    expect(bar).toHaveStyle({ width: '100%' })
  })

  // --- 色バリアント ---

  it('デフォルト (brand) の色が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} />)
    const bar = container.querySelector('[style]')
    expect(bar?.className).toContain('bg-brand-500')
  })

  it('emerald の色が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} color="emerald" />)
    const bar = container.querySelector('[style]')
    expect(bar?.className).toContain('bg-emerald-500')
  })

  it('amber の色が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} color="amber" />)
    const bar = container.querySelector('[style]')
    expect(bar?.className).toContain('bg-amber-500')
  })

  it('red の色が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} color="red" />)
    const bar = container.querySelector('[style]')
    expect(bar?.className).toContain('bg-red-500')
  })

  // --- 背景色 ---

  it('デフォルトの背景色が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} />)
    // 外側の div が背景色を持つ
    const outer = container.firstChild
    expect((outer as HTMLElement).className).toContain('bg-slate-100')
  })

  it('カスタム bgColor が適用される', () => {
    const { container } = render(<ProgressBar percentage={50} bgColor="bg-blue-100" />)
    const outer = container.firstChild
    expect((outer as HTMLElement).className).toContain('bg-blue-100')
  })

  // --- カスタム className ---

  it('追加の className がマージされる', () => {
    const { container } = render(<ProgressBar percentage={50} className="mt-4" />)
    const outer = container.firstChild
    expect((outer as HTMLElement).className).toContain('mt-4')
  })
})
