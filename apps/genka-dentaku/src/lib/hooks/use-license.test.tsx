import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { LicenseStatus } from '@/lib/license/verify'

const VALID_KEY = 'GENKA-valid-dev-key'
const ACTIVE: LicenseStatus = {
  status: 'active',
  plan: 'annual',
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-08T00:00:00.000Z',
  isPro: true,
  inGrace: false,
  daysRemaining: 300,
}
const NONE: LicenseStatus = {
  status: 'none',
  plan: null,
  issuedAt: null,
  expiresAt: null,
  isPro: false,
  inGrace: false,
  daysRemaining: null,
}

vi.mock('@/lib/license/verify', () => ({
  verifyLicenseKey: vi.fn(async (key: string | null) => (key === VALID_KEY ? ACTIVE : NONE)),
  isEd25519Supported: vi.fn(async () => true),
}))

import { AppStateProvider, useAppState } from '@/lib/state/AppStateProvider'
import { useLicense } from './use-license'

function wrapper({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>
}

describe('useLicense', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('Free: gates Pro features and caps menus at FREE_MAX_MENUS', async () => {
    const { result } = renderHook(() => useLicense(), { wrapper })
    await act(async () => {})

    expect(result.current.isPro).toBe(false)
    expect(result.current.gate('export-csv')).toBe(false)
    expect(result.current.gate('bulk-simulation')).toBe(false)
    expect(result.current.canAddMenu(0)).toBe(true)
    expect(result.current.canAddMenu(2)).toBe(true)
    expect(result.current.canAddMenu(3)).toBe(false)
  })

  it('Pro: unlocks features and unlimited menus after a valid key', async () => {
    const { result } = renderHook(
      () => ({ license: useLicense(), app: useAppState() }),
      { wrapper },
    )
    await act(async () => {})

    await act(async () => {
      await result.current.app.actions.applyLicenseKey(VALID_KEY)
    })

    expect(result.current.license.isPro).toBe(true)
    expect(result.current.license.gate('export-csv')).toBe(true)
    expect(result.current.license.canAddMenu(99)).toBe(true)
  })
})
