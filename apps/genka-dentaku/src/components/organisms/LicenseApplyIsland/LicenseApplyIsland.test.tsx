import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STORAGE_KEY } from '@/lib/constants/storage-keys'
import { verifyLicenseKey } from '@/lib/license/verify'
import { LicenseApplyIsland } from './LicenseApplyIsland'

// crypto/Ed25519 に依存せずゲート挙動だけを検証するため verify を差し替える。
vi.mock('@/lib/license/verify', () => ({ verifyLicenseKey: vi.fn() }))
const mockVerify = vi.mocked(verifyLicenseKey)

beforeEach(() => {
  localStorage.clear()
  mockVerify.mockReset()
})

describe('LicenseApplyIsland', () => {
  it('persists a signature-valid Pro key and shows success', async () => {
    mockVerify.mockResolvedValue({
      status: 'active',
      plan: 'annual',
      issuedAt: '2026-07-09T00:00:00.000Z',
      expiresAt: '2027-07-09T00:00:00.000Z',
      isPro: true,
      inGrace: false,
      daysRemaining: 300,
    })
    const user = userEvent.setup()
    render(<LicenseApplyIsland />)

    await user.type(await screen.findByLabelText('ライセンスキー'), 'GENKA-AAAA-BBBB-CCCC-DDDD')
    await user.click(screen.getByRole('button', { name: '解錠' }))

    expect(await screen.findByText('Proを解錠しました')).toBeInTheDocument()
    // 端末内に署名検証済みキーが保存される。
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.license.key).toBe('GENKA-AAAA-BBBB-CCCC-DDDD')
    // 解錠後はアプリへの導線が出る。
    expect(screen.getByRole('link', { name: 'アプリを開く' })).toHaveAttribute('href', '/app')
  })

  it('shows an error and does not persist an invalid key', async () => {
    mockVerify.mockResolvedValue({
      status: 'invalid',
      plan: null,
      issuedAt: null,
      expiresAt: null,
      isPro: false,
      inGrace: false,
      daysRemaining: null,
    })
    const user = userEvent.setup()
    render(<LicenseApplyIsland />)

    await user.type(await screen.findByLabelText('ライセンスキー'), 'BROKEN-KEY')
    await user.click(screen.getByRole('button', { name: '解錠' }))

    expect(await screen.findByText('ライセンスキーが正しくありません')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
