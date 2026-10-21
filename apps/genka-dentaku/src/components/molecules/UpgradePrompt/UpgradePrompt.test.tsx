import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpgradePrompt } from './UpgradePrompt'

describe('UpgradePrompt', () => {
  it('shows the value copy and fires onUpgrade', async () => {
    const onUpgrade = vi.fn()
    render(
      <UpgradePrompt description="今すぐ全メニューの原価表をPDFで出せます" onUpgrade={onUpgrade} />,
    )
    expect(screen.getByText('この機能はProです')).toBeInTheDocument()
    expect(screen.getByText('今すぐ全メニューの原価表をPDFで出せます')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Proにする' }))
    expect(onUpgrade).toHaveBeenCalledOnce()
  })

  it('renders a pricing link and a dismiss action when provided', async () => {
    const onDismiss = vi.fn()
    render(<UpgradePrompt pricingHref="/pricing" onDismiss={onDismiss} />)
    expect(screen.getByRole('link', { name: '料金を見る' })).toHaveAttribute('href', '/pricing')
    await userEvent.click(screen.getByRole('button', { name: 'あとで' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
