import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatYen } from '@/lib/utils/format'
import { PricingTable } from './PricingTable'

/** PlanFeatureRow の feature テキストから、その行の grid コンテナを取得する。 */
function rowOf(featureText: string): HTMLElement {
  const span = screen.getByText(featureText)
  const row = span.closest('div')
  if (row === null) throw new Error(`row not found for: ${featureText}`)
  return row
}

describe('PricingTable', () => {
  it('lists 原価率アラート as a Free feature (○ in both Free and Pro columns)', () => {
    render(<PricingTable />)
    const row = rowOf('原価率アラート（信号色＋悪い順ダッシュボード）')
    // 「対応」が2つ = Free/Pro 両列とも ○（＝ Free で使える）。「非対応」は無い。
    expect(within(row).getAllByRole('img', { name: '対応' })).toHaveLength(2)
    expect(within(row).queryByRole('img', { name: '非対応' })).toBeNull()
  })

  it('lists JSONバックアップ as a Free feature (○ in both columns)', () => {
    render(<PricingTable />)
    const row = rowOf('JSONバックアップ／復元')
    expect(within(row).getAllByRole('img', { name: '対応' })).toHaveLength(2)
    expect(within(row).queryByRole('img', { name: '非対応' })).toBeNull()
  })

  it('gates 一括適用 and PDF/CSV to Pro only (Free shows 非対応)', () => {
    render(<PricingTable />)
    const bulk = rowOf('値上げシミュレーション（一括適用）')
    expect(within(bulk).getAllByRole('img', { name: '対応' })).toHaveLength(1) // Pro のみ ○
    expect(within(bulk).getByRole('img', { name: '非対応' })).toBeInTheDocument() // Free は —

    const output = rowOf('PDF / CSV 出力')
    expect(within(output).getAllByRole('img', { name: '対応' })).toHaveLength(1)
    expect(within(output).getByRole('img', { name: '非対応' })).toBeInTheDocument()
  })

  it('touts only Pro-only benefits in the header (does not tout 原価率アラート — a Free feature)', () => {
    render(<PricingTable />)
    expect(screen.getByText(/値上げシミュレーションの一括適用/)).toBeInTheDocument()
    expect(screen.getByText('レシピ（メニュー）無制限')).toBeInTheDocument()
    expect(screen.getByText(/CSV・PDF 出力/)).toBeInTheDocument()
  })

  it('defaults to annual pricing and switches the displayed price on toggle', async () => {
    const user = userEvent.setup()
    render(<PricingTable />)

    // 既定 = 年額（主 CTA）
    expect(screen.getByText('/年')).toBeInTheDocument()
    expect(screen.getByText(formatYen(9800))).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '月額' }))

    expect(screen.getByText('/月')).toBeInTheDocument()
    expect(screen.getByText(formatYen(980))).toBeInTheDocument()
  })

  it('falls back to 準備中 (href #) when the Stripe link env var is unset', () => {
    render(<PricingTable />)
    const cta = screen.getByRole('link', { name: '準備中' })
    expect(cta).toHaveAttribute('href', '#')
    expect(cta).toHaveAttribute('aria-disabled', 'true')
  })
})
