import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpgradeGateBanner } from './UpgradeGateBanner'

describe('UpgradeGateBanner', () => {
  it('shows the free-limit reassurance and a pricing CTA', () => {
    render(<UpgradeGateBanner reason="free-limit" />)
    expect(screen.getByText('メニューは3件までです')).toBeInTheDocument()
    expect(screen.getByText(/今ある3件は消えません/)).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: 'Proにアップグレード' })
    expect(cta).toHaveAttribute('href', '/pricing')
  })

  it('offers the sample-clear escape only when there are samples', async () => {
    const onClearSamples = vi.fn()
    const { rerender } = render(<UpgradeGateBanner reason="free-limit" onClearSamples={onClearSamples} hasSamples={false} />)
    expect(screen.queryByText('サンプルを削除して枠を空ける')).not.toBeInTheDocument()

    rerender(<UpgradeGateBanner reason="free-limit" onClearSamples={onClearSamples} hasSamples />)
    await userEvent.click(screen.getByText('サンプルを削除して枠を空ける'))
    expect(onClearSamples).toHaveBeenCalledOnce()
  })

  it('renders feature-lock copy for the CSV gate', () => {
    render(<UpgradeGateBanner reason="export-csv" />)
    expect(screen.getByText('CSV出力はProです')).toBeInTheDocument()
  })
})
