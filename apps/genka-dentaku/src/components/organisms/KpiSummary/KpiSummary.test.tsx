import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DashboardKpi } from '@/lib/domain'
import { KpiSummary } from './KpiSummary'

const KPI: DashboardKpi = { avgRatePercent1: 24.8, dangerCount: 1, menuCount: 4, avgMarginYen: 615 }

describe('KpiSummary', () => {
  it('renders the hero average rate and the sub KPIs', () => {
    render(<KpiSummary kpi={KPI} warn={30} danger={35} />)
    expect(screen.getAllByText('24.8%').length).toBeGreaterThanOrEqual(1) // hero white number + pill
    expect(screen.getByText('危険メニュー')).toBeInTheDocument()
    expect(screen.getByText('メニュー数')).toBeInTheDocument()
    expect(screen.getByText('￥615')).toBeInTheDocument()
    // status word from the pill (good, since 24.8 < warn 30)
    expect(screen.getByText('良好')).toBeInTheDocument()
  })

  it('shows 「—」 for the average when no menus are rateable', () => {
    render(<KpiSummary kpi={{ avgRatePercent1: null, dangerCount: 0, menuCount: 0, avgMarginYen: null }} warn={30} danger={35} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('要確認')).toBeInTheDocument()
  })

  it('opens the legend', async () => {
    const onOpenLegend = vi.fn()
    render(<KpiSummary kpi={KPI} warn={30} danger={35} onOpenLegend={onOpenLegend} />)
    await userEvent.click(screen.getByRole('button', { name: '凡例' }))
    expect(onOpenLegend).toHaveBeenCalledOnce()
  })
})
