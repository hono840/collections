import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Settings } from '@/lib/domain'
import type { LicenseStatus } from '@/lib/license/verify'
import { SettingsPanel } from './SettingsPanel'

const SETTINGS: Settings = {
  alertWarnThreshold: 30,
  alertDangerThreshold: 35,
  defaultIngredientTaxRate: 8,
  defaultSellTaxRate: 10,
  defaultPriceIncludesTax: true,
  simRoundingUnit: 10,
  currency: 'JPY',
}

const NONE: LicenseStatus = { status: 'none', plan: null, issuedAt: null, expiresAt: null, isPro: false, inGrace: false, daysRemaining: null }
const GRACE: LicenseStatus = {
  status: 'grace',
  plan: 'annual',
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-08T00:00:00.000Z',
  isPro: true,
  inGrace: true,
  daysRemaining: 5,
}

function base(overrides: Partial<React.ComponentProps<typeof SettingsPanel>> = {}) {
  return {
    settings: SETTINGS,
    onChangeSettings: vi.fn(),
    license: NONE,
    ed25519Supported: true,
    onVerifyLicense: vi.fn(async () => NONE),
    onClearLicense: vi.fn(),
    hasSamples: false,
    onClearSamples: vi.fn(),
    onResetAll: vi.fn(),
    ...overrides,
  }
}

describe('SettingsPanel', () => {
  it('commits a valid threshold but blocks an inverted one', () => {
    const onChangeSettings = vi.fn()
    render(<SettingsPanel {...base({ onChangeSettings })} />)

    fireEvent.change(screen.getByLabelText('良好の上限'), { target: { value: '25' } })
    expect(onChangeSettings).toHaveBeenCalledWith({ alertWarnThreshold: 25, alertDangerThreshold: 35 })

    onChangeSettings.mockClear()
    fireEvent.change(screen.getByLabelText('良好の上限'), { target: { value: '40' } }) // >= danger 35
    expect(onChangeSettings).not.toHaveBeenCalled()
  })

  it('changes the simulation rounding unit', async () => {
    const onChangeSettings = vi.fn()
    render(<SettingsPanel {...base({ onChangeSettings })} />)
    await userEvent.selectOptions(screen.getByLabelText('推奨売価の丸め単位'), '50')
    expect(onChangeSettings).toHaveBeenCalledWith({ simRoundingUnit: 50 })
  })

  it('shows the Pro status with a grace countdown and allows clearing', async () => {
    const onClearLicense = vi.fn()
    render(<SettingsPanel {...base({ license: GRACE, onClearLicense })} />)
    expect(screen.getByText('Pro利用中')).toBeInTheDocument()
    expect(screen.getByText(/あと/)).toHaveTextContent('あと5日')
    await userEvent.click(screen.getByRole('button', { name: 'ライセンスを解除' }))
    expect(onClearLicense).toHaveBeenCalledOnce()
  })

  it('shows the unsupported-browser message when Ed25519 is unavailable', () => {
    render(<SettingsPanel {...base({ ed25519Supported: false })} />)
    expect(screen.getByText(/このブラウザではライセンスを確認できません/)).toBeInTheDocument()
  })

  it('verifies a license key and reflects success', async () => {
    const active: LicenseStatus = { ...GRACE, status: 'active', inGrace: false, daysRemaining: 300 }
    const onVerifyLicense = vi.fn(async () => active)
    render(<SettingsPanel {...base({ onVerifyLicense })} />)
    await userEvent.type(screen.getByLabelText('ライセンスキー'), 'GENKA-xxx')
    await userEvent.click(screen.getByRole('button', { name: '解錠' }))
    expect(onVerifyLicense).toHaveBeenCalledWith('GENKA-xxx')
    expect(await screen.findByText('Proを解錠しました')).toBeInTheDocument()
  })

  it('requires confirmation before wiping all data', async () => {
    const onResetAll = vi.fn()
    render(<SettingsPanel {...base({ onResetAll })} />)
    await userEvent.click(screen.getByRole('button', { name: '全データを消去' }))
    expect(onResetAll).not.toHaveBeenCalled()
    // Now the confirm alertdialog is shown.
    await userEvent.click(screen.getByRole('button', { name: '全データを消去' }))
    expect(onResetAll).toHaveBeenCalledOnce()
  })
})
