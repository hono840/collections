'use client'

/**
 * Single source of truth for Free/Pro gating (architecture §7.1). Reads the verified license
 * status from the provider and adds the two gate helpers used across the UI.
 */
import { FREE_MAX_MENUS } from '@/lib/constants/limits'
import { useAppState } from '@/lib/state/AppStateProvider'
import type { LicenseStatus } from '@/lib/license/verify'

export type UseLicenseResult = LicenseStatus & {
  /** Whether another menu may be added at the current count (Pro = unlimited). */
  canAddMenu: (currentMenuCount: number) => boolean
  /** Whether a Pro-only feature is unlocked. */
  gate: (feature: 'export-csv' | 'export-pdf' | 'bulk-simulation') => boolean
}

export function useLicense(): UseLicenseResult {
  const { license } = useAppState()
  return {
    ...license,
    canAddMenu: (currentMenuCount: number) => license.isPro || currentMenuCount < FREE_MAX_MENUS,
    gate: () => license.isPro,
  }
}
