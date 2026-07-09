import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { LicenseStatus } from '@/lib/license/verify'
import { toExTax } from '@/lib/domain/tax'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import type { CanonicalState } from '@/lib/domain/schema'

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

// Decouple the provider from Web Crypto: deterministic license verification.
vi.mock('@/lib/license/verify', () => ({
  verifyLicenseKey: vi.fn(async (key: string | null) => (key === VALID_KEY ? ACTIVE : NONE)),
  isEd25519Supported: vi.fn(async () => true),
}))

import { AppStateProvider, useAppState, type MenuInput, type IngredientInput } from './AppStateProvider'

function wrapper({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>
}

function menuInput(name: string): MenuInput {
  return { name, sellInputPrice: 900, sellPriceIncludesTax: true, sellTaxRate: 10, items: [] }
}

function ingredientInput(overrides: Partial<IngredientInput> = {}): IngredientInput {
  return {
    name: '鶏もも肉',
    inputPrice: 216,
    priceIncludesTax: true,
    taxRate: 8,
    purchaseQuantity: 1000,
    unit: 'g',
    dimension: 'weight',
    yieldPercent: 90,
    ...overrides,
  }
}

async function renderProvider() {
  const rendered = renderHook(() => useAppState(), { wrapper })
  // Flush the mount effects (classifying load + async license verification).
  await act(async () => {})
  return rendered
}

describe('AppStateProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('enforces the Free menu limit at 3', async () => {
    const { result } = await renderProvider()

    const results: Array<{ ok: boolean }> = []
    act(() => {
      results.push(result.current.actions.addMenu(menuInput('A')))
      results.push(result.current.actions.addMenu(menuInput('B')))
      results.push(result.current.actions.addMenu(menuInput('C')))
    })
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }])
    expect(result.current.state.menus).toHaveLength(3)

    let fourth: { ok: true } | { ok: false; reason: 'free-limit' } = { ok: true }
    act(() => {
      fourth = result.current.actions.addMenu(menuInput('D'))
    })
    expect(fourth).toEqual({ ok: false, reason: 'free-limit' })
    expect(result.current.state.menus).toHaveLength(3)
  })

  it('normalizes ex-tax through toExTax on addIngredient (invariant holds)', async () => {
    const { result } = await renderProvider()

    act(() => {
      result.current.actions.addIngredient(ingredientInput({ inputPrice: 216, priceIncludesTax: true, taxRate: 8 }))
    })

    const ing = result.current.state.ingredients[0]
    expect(ing.purchasePriceExTax).toBeCloseTo(200, 10)
    expect(ing.purchasePriceExTax).toBeCloseTo(toExTax(ing.inputPrice, ing.priceIncludesTax, ing.taxRate), 10)
    expect(ing.isSample).toBe(false)
  })

  it('importState replace swaps the whole state and re-normalizes ex-tax', async () => {
    const { result } = await renderProvider()

    // Deliberately store a WRONG purchasePriceExTax to prove import re-normalizes from input meta.
    const imported: CanonicalState = {
      ...DEFAULT_STATE,
      ingredients: [
        {
          id: 'imp-1',
          name: 'インポート食材',
          purchasePriceExTax: 999, // wrong on purpose
          inputPrice: 216,
          priceIncludesTax: true,
          taxRate: 8,
          purchaseQuantity: 1000,
          unit: 'g',
          dimension: 'weight',
          yieldPercent: 100,
          isSample: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      menus: [],
    }

    act(() => {
      result.current.actions.importState(imported, 'replace')
    })

    expect(result.current.state.ingredients).toHaveLength(1)
    expect(result.current.state.ingredients[0].id).toBe('imp-1')
    expect(result.current.state.ingredients[0].purchasePriceExTax).toBeCloseTo(200, 10)
    expect(result.current.loadIssue).toBe('ok')
  })

  it('applyLicenseKey flips isPro and unlocks unlimited menus with a valid key', async () => {
    const { result } = await renderProvider()
    expect(result.current.license.isPro).toBe(false)

    await act(async () => {
      await result.current.actions.applyLicenseKey(VALID_KEY)
    })
    expect(result.current.license.isPro).toBe(true)
    expect(result.current.state.license.key).toBe(VALID_KEY)

    // Pro: adding a 4th+ menu is allowed.
    act(() => {
      result.current.actions.addMenu(menuInput('A'))
      result.current.actions.addMenu(menuInput('B'))
      result.current.actions.addMenu(menuInput('C'))
    })
    let fourth: { ok: true } | { ok: false; reason: 'free-limit' } = { ok: false, reason: 'free-limit' }
    act(() => {
      fourth = result.current.actions.addMenu(menuInput('D'))
    })
    expect(fourth).toEqual({ ok: true })
    expect(result.current.state.menus).toHaveLength(4)
  })
})
