import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveCostSummary } from './LiveCostSummary'

describe('LiveCostSummary', () => {
  it('renders rate / cost / margin with the status pill', () => {
    render(<LiveCostSummary costYen={203} ratePercent1={24.8} marginYen={615} status="good" warn={30} danger={35} />)
    expect(screen.getAllByText('24.8%').length).toBeGreaterThanOrEqual(1) // hero + pill
    expect(screen.getByText('￥203')).toBeInTheDocument()
    expect(screen.getByText('￥615')).toBeInTheDocument()
    expect(screen.getByText('良好')).toBeInTheDocument()
  })

  it('explains a blank rate: no sell price vs no materials', () => {
    const { rerender } = render(
      <LiveCostSummary costYen={203} ratePercent1={null} marginYen={null} status="attention" warn={30} danger={35} />,
    )
    expect(screen.getByText('売価を入力してください')).toBeInTheDocument()

    rerender(<LiveCostSummary costYen={null} ratePercent1={null} marginYen={null} status="attention" warn={30} danger={35} />)
    expect(screen.getByText('材料を追加すると計算されます')).toBeInTheDocument()
  })

  it('disables the simulate entry when there is no cost yet', async () => {
    const onSimulate = vi.fn()
    render(
      <LiveCostSummary costYen={null} ratePercent1={null} marginYen={null} status="attention" warn={30} danger={35} onSimulate={onSimulate} />,
    )
    const button = screen.getByRole('button', { name: '値上げをシミュレーション' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onSimulate).not.toHaveBeenCalled()
  })
})
