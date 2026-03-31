import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthlySummaryCard } from './MonthlySummaryCard'

describe('MonthlySummaryCard', () => {
  it('「今月の支出」ラベルが表示される', () => {
    render(<MonthlySummaryCard totalSpent={50000} totalBudget={100000} />)
    expect(screen.getByText('今月の支出')).toBeInTheDocument()
  })

  it('支出金額が表示される', () => {
    // totalSpent=50000, remaining=50000 -> ￥50,000 appears twice
    render(<MonthlySummaryCard totalSpent={50000} totalBudget={100000} />)
    const matches = screen.getAllByText(/[¥￥]50,000/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('予算が設定されている場合、予算金額が表示される', () => {
    render(<MonthlySummaryCard totalSpent={50000} totalBudget={100000} />)
    expect(screen.getByText(/[¥￥]100,000/)).toBeInTheDocument()
  })

  it('残りの予算が表示される (予算内)', () => {
    render(<MonthlySummaryCard totalSpent={50000} totalBudget={100000} />)
    expect(screen.getByText(/残り/)).toBeInTheDocument()
    // ￥50,000 appears for both spent and remaining
    const matches = screen.getAllByText(/[¥￥]50,000/)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('超過している場合「超過」が表示される', () => {
    render(<MonthlySummaryCard totalSpent={120000} totalBudget={100000} />)
    expect(screen.getByText(/超過/)).toBeInTheDocument()
    expect(screen.getByText(/[¥￥]20,000/)).toBeInTheDocument()
  })

  it('予算が 0 の場合、予算関連の情報が表示されない', () => {
    render(<MonthlySummaryCard totalSpent={50000} totalBudget={0} />)
    expect(screen.queryByText(/残り/)).not.toBeInTheDocument()
    expect(screen.queryByText(/予算:/)).not.toBeInTheDocument()
  })

  it('75%以上 100%未満の場合、黄色のプログレスバーが表示される', () => {
    const { container } = render(
      <MonthlySummaryCard totalSpent={80000} totalBudget={100000} />
    )
    const progressBar = container.querySelector('.bg-yellow-400')
    expect(progressBar).toBeInTheDocument()
  })

  it('100%以上の場合、赤色のプログレスバーが表示される', () => {
    const { container } = render(
      <MonthlySummaryCard totalSpent={110000} totalBudget={100000} />
    )
    const progressBar = container.querySelector('.bg-red-400')
    expect(progressBar).toBeInTheDocument()
  })

  it('75%未満の場合、緑色のプログレスバーが表示される', () => {
    const { container } = render(
      <MonthlySummaryCard totalSpent={30000} totalBudget={100000} />
    )
    const progressBar = container.querySelector('.bg-emerald-400')
    expect(progressBar).toBeInTheDocument()
  })
})
