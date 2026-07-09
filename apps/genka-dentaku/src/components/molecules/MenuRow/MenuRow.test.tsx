import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuRow } from './MenuRow'

describe('MenuRow', () => {
  it('renders name, formatted 売価/粗利 and the cost-rate pill, and opens on click', async () => {
    const onOpen = vi.fn()
    render(
      <MenuRow name="唐揚げ定食" sellPrice={900} margin={615} rate={24.8} status="good" onOpen={onOpen} />,
    )
    expect(screen.getByText('唐揚げ定食')).toBeInTheDocument()
    expect(screen.getByText('￥900')).toBeInTheDocument()
    expect(screen.getByText('￥615')).toBeInTheDocument()
    expect(screen.getByText('24.8%')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('shows 「—」 for an unset sell price and the 要確認 pill', () => {
    render(<MenuRow name="新メニュー" sellPrice={null} rate={null} status="attention" />)
    // 「—」 appears for both the unset 売価 and the null-rate pill.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('要確認')).toBeInTheDocument()
  })
})
