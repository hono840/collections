import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimulationPanel, type SimMenu } from './SimulationPanel'

const MENU: SimMenu = {
  id: 'karaage',
  name: '唐揚げ定食',
  costExTax: 203,
  sellTaxRate: 10,
  currentSellIncTax: 900,
  currentRatePercent1: 24.8,
  currentStatus: 'good',
}

describe('SimulationPanel (single)', () => {
  it('recommends a price (¥10 ceil) and applies the ex-tax value', async () => {
    const onApplySingle = vi.fn()
    render(
      <SimulationPanel open onClose={() => {}} mode="single" isPro roundingUnit={10} warn={30} danger={35} target={MENU} onApplySingle={onApplySingle} />,
    )
    // 203 / 0.30 = 676.67 -> ceil¥10 -> 680 ex-tax -> 748 incl-tax (readout + after-stat).
    expect(screen.getAllByText('￥748').length).toBeGreaterThanOrEqual(1)
    await userEvent.click(screen.getByRole('button', { name: 'この売価を反映' }))
    expect(onApplySingle).toHaveBeenCalledWith(680)
  })

  it('shows the non-aggressive bulk upsell for Free users', () => {
    render(<SimulationPanel open onClose={() => {}} mode="single" isPro={false} roundingUnit={10} warn={30} danger={35} target={MENU} onApplySingle={() => {}} />)
    expect(screen.getByText('一括適用はProです')).toBeInTheDocument()
  })
})

describe('SimulationPanel (bulk)', () => {
  it('gates bulk mode behind Pro for Free users', () => {
    render(<SimulationPanel open onClose={() => {}} mode="bulk" isPro={false} roundingUnit={10} warn={30} danger={35} menus={[MENU]} onApplyBulk={() => {}} />)
    expect(screen.getByText('一括適用はProです')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /件に一括適用/ })).not.toBeInTheDocument()
  })

  it('previews and applies across menus for Pro users', async () => {
    const onApplyBulk = vi.fn()
    render(<SimulationPanel open onClose={() => {}} mode="bulk" isPro roundingUnit={10} warn={30} danger={35} menus={[MENU]} onApplyBulk={onApplyBulk} />)
    await userEvent.click(screen.getByRole('button', { name: '1件に一括適用' }))
    expect(onApplyBulk).toHaveBeenCalledWith([{ id: 'karaage', newSellExTax: 680 }])
  })
})
