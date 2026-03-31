import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DaysRemainingBadge } from './DaysRemainingBadge'

describe('DaysRemainingBadge', () => {
  it('現在の月でない場合「過去の月」が表示される', () => {
    render(<DaysRemainingBadge days={10} isCurrentMonth={false} />)
    expect(screen.getByText('過去の月')).toBeInTheDocument()
  })

  it('残り日数が表示される', () => {
    render(<DaysRemainingBadge days={15} isCurrentMonth={true} />)
    expect(screen.getByText('残り15日')).toBeInTheDocument()
  })

  it('残り3日以下の場合は red 色が適用される', () => {
    const { container } = render(
      <DaysRemainingBadge days={2} isCurrentMonth={true} />
    )
    expect(container.querySelector('.bg-red-100, .text-red-700')).toBeTruthy()
    expect(screen.getByText('残り2日')).toBeInTheDocument()
  })

  it('残り4〜7日の場合は amber 色が適用される', () => {
    const { container } = render(
      <DaysRemainingBadge days={5} isCurrentMonth={true} />
    )
    const badge = screen.getByText('残り5日').closest('span')
    expect(badge?.className).toContain('bg-amber-100')
  })

  it('残り8日以上の場合は emerald 色が適用される', () => {
    render(<DaysRemainingBadge days={15} isCurrentMonth={true} />)
    const badge = screen.getByText('残り15日').closest('span')
    expect(badge?.className).toContain('bg-emerald-100')
  })

  it('残り0日の場合は red 色が適用される', () => {
    render(<DaysRemainingBadge days={0} isCurrentMonth={true} />)
    const badge = screen.getByText('残り0日').closest('span')
    expect(badge?.className).toContain('bg-red-100')
  })
})
