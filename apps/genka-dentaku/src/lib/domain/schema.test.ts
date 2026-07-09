import { describe, it, expect } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  WEIGHT_UNITS,
  VOLUME_UNITS,
  COUNT_UNIT_PRESETS,
  dimensionSchema,
  ingredientSchema,
  recipeItemSchema,
  menuSchema,
  settingsSchema,
  licenseSchema,
  metaSchema,
  canonicalStateSchema,
  licensePayloadSchema,
} from './schema'

// ── Fixture builders (valid baselines that individual cases override) ──

function makeIngredient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ing-1',
    name: 'キャベツ',
    purchasePriceExTax: 200,
    inputPrice: 200,
    priceIncludesTax: false,
    taxRate: 8,
    purchaseQuantity: 1000,
    unit: 'g',
    dimension: 'weight',
    yieldPercent: 80,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeMenu(overrides: Record<string, unknown> = {}) {
  return {
    id: 'menu-1',
    name: '唐揚げ定食',
    sellPriceExTax: 818.18,
    sellInputPrice: 900,
    sellPriceIncludesTax: true,
    sellTaxRate: 10,
    items: [{ ingredientId: 'ing-1', quantity: 80, unit: 'g' }],
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    alertWarnThreshold: 30,
    alertDangerThreshold: 35,
    defaultIngredientTaxRate: 8,
    defaultSellTaxRate: 10,
    defaultPriceIncludesTax: true,
    simRoundingUnit: 10,
    currency: 'JPY',
    ...overrides,
  }
}

describe('CURRENT_SCHEMA_VERSION / unit presets', () => {
  it('current schema version is the literal 1 (single source of truth)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
  })

  it('exposes the fixed unit arrays as the source of truth', () => {
    expect(WEIGHT_UNITS).toEqual(['g', 'kg'])
    expect(VOLUME_UNITS).toEqual(['ml', 'L'])
    expect(COUNT_UNIT_PRESETS).toContain('個')
    expect(COUNT_UNIT_PRESETS).toContain('枚')
  })
})

describe('dimensionSchema', () => {
  it('accepts weight/volume/count', () => {
    expect(dimensionSchema.safeParse('weight').success).toBe(true)
    expect(dimensionSchema.safeParse('volume').success).toBe(true)
    expect(dimensionSchema.safeParse('count').success).toBe(true)
  })
  it('rejects unknown dimensions', () => {
    expect(dimensionSchema.safeParse('mass').success).toBe(false)
  })
})

describe('ingredientSchema', () => {
  it('parses a valid ingredient', () => {
    expect(ingredientSchema.safeParse(makeIngredient()).success).toBe(true)
  })

  it('yieldPercent boundaries: 0 rejected, 1 ok, 100 ok, 101 rejected', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ yieldPercent: 0 })).success).toBe(false)
    expect(ingredientSchema.safeParse(makeIngredient({ yieldPercent: 1 })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ yieldPercent: 100 })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ yieldPercent: 101 })).success).toBe(false)
  })

  it('purchaseQuantity must be > 0 (zero-division guard)', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ purchaseQuantity: 0 })).success).toBe(false)
    expect(ingredientSchema.safeParse(makeIngredient({ purchaseQuantity: -1 })).success).toBe(false)
    expect(ingredientSchema.safeParse(makeIngredient({ purchaseQuantity: 0.001 })).success).toBe(true)
  })

  it('purchasePriceExTax must be non-negative (0 allowed per PRD 8.4)', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ purchasePriceExTax: 0 })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ purchasePriceExTax: -1 })).success).toBe(false)
  })

  it('name must be 1..60 chars', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ name: '' })).success).toBe(false)
    expect(ingredientSchema.safeParse(makeIngredient({ name: 'x'.repeat(60) })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ name: 'x'.repeat(61) })).success).toBe(false)
  })

  it('weight dimension only allows g|kg', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'weight', unit: 'g' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'weight', unit: 'kg' })).success).toBe(true)
    const bad = ingredientSchema.safeParse(makeIngredient({ dimension: 'weight', unit: '個' }))
    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(['unit'])
  })

  it('volume dimension only allows ml|L', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'volume', unit: 'ml' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'volume', unit: 'L' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'volume', unit: 'g' })).success).toBe(false)
  })

  it('count dimension allows any non-empty free-form unit (個/枚/カスタム)', () => {
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'count', unit: '個' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'count', unit: '枚' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'count', unit: 'カスタム房' })).success).toBe(true)
    expect(ingredientSchema.safeParse(makeIngredient({ dimension: 'count', unit: '' })).success).toBe(false)
  })
})

describe('recipeItemSchema', () => {
  it('parses a valid item and allows quantity 0 (PRD 8.10)', () => {
    expect(recipeItemSchema.safeParse({ ingredientId: 'ing-1', quantity: 80, unit: 'g' }).success).toBe(true)
    expect(recipeItemSchema.safeParse({ ingredientId: 'ing-1', quantity: 0, unit: 'g' }).success).toBe(true)
  })
  it('rejects negative quantity and empty unit/id', () => {
    expect(recipeItemSchema.safeParse({ ingredientId: 'ing-1', quantity: -1, unit: 'g' }).success).toBe(false)
    expect(recipeItemSchema.safeParse({ ingredientId: 'ing-1', quantity: 1, unit: '' }).success).toBe(false)
    expect(recipeItemSchema.safeParse({ ingredientId: '', quantity: 1, unit: 'g' }).success).toBe(false)
  })
})

describe('menuSchema', () => {
  it('parses a valid menu', () => {
    expect(menuSchema.safeParse(makeMenu()).success).toBe(true)
  })
  it('sellPriceExTax non-negative (0 allowed = 要確認), negative rejected', () => {
    expect(menuSchema.safeParse(makeMenu({ sellPriceExTax: 0, sellInputPrice: 0 })).success).toBe(true)
    expect(menuSchema.safeParse(makeMenu({ sellPriceExTax: -1 })).success).toBe(false)
  })
  it('accepts an empty items array', () => {
    expect(menuSchema.safeParse(makeMenu({ items: [] })).success).toBe(true)
  })
})

describe('settingsSchema', () => {
  it('parses valid settings', () => {
    expect(settingsSchema.safeParse(makeSettings()).success).toBe(true)
  })
  it('requires warn < danger (inversion and equality rejected)', () => {
    expect(settingsSchema.safeParse(makeSettings({ alertWarnThreshold: 35, alertDangerThreshold: 30 })).success).toBe(false)
    expect(settingsSchema.safeParse(makeSettings({ alertWarnThreshold: 30, alertDangerThreshold: 30 })).success).toBe(false)
    expect(settingsSchema.safeParse(makeSettings({ alertWarnThreshold: 29.9, alertDangerThreshold: 30 })).success).toBe(true)
  })
  it('simRoundingUnit is limited to 1|10|50|100', () => {
    for (const u of [1, 10, 50, 100]) {
      expect(settingsSchema.safeParse(makeSettings({ simRoundingUnit: u })).success).toBe(true)
    }
    expect(settingsSchema.safeParse(makeSettings({ simRoundingUnit: 20 })).success).toBe(false)
  })
  it('currency must be the JPY literal', () => {
    expect(settingsSchema.safeParse(makeSettings({ currency: 'USD' })).success).toBe(false)
  })
})

describe('licenseSchema', () => {
  it('accepts null key/lastSeenDate (未解錠)', () => {
    expect(licenseSchema.safeParse({ key: null, lastSeenDate: null }).success).toBe(true)
  })
  it('accepts a stored key + lastSeenDate', () => {
    expect(licenseSchema.safeParse({ key: 'GENKA-abc-def', lastSeenDate: '2026-07-09' }).success).toBe(true)
  })
  it('requires both fields to be present', () => {
    expect(licenseSchema.safeParse({}).success).toBe(false)
    expect(licenseSchema.safeParse({ key: null }).success).toBe(false)
  })
})

describe('metaSchema', () => {
  it('parses onboarding/sample flags', () => {
    expect(metaSchema.safeParse({ onboardingDone: false, sampleSeeded: false }).success).toBe(true)
    expect(metaSchema.safeParse({ onboardingDone: true }).success).toBe(false)
  })
})

describe('canonicalStateSchema', () => {
  const validState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: { onboardingDone: false, sampleSeeded: false },
    settings: makeSettings(),
    ingredients: [makeIngredient()],
    menus: [makeMenu()],
    license: { key: null, lastSeenDate: null },
  }

  it('parses a valid canonical state', () => {
    expect(canonicalStateSchema.safeParse(validState).success).toBe(true)
  })
  it('rejects a schemaVersion other than the current literal', () => {
    expect(canonicalStateSchema.safeParse({ ...validState, schemaVersion: 2 }).success).toBe(false)
  })
  it('rejects a state carrying an invalid nested ingredient', () => {
    expect(
      canonicalStateSchema.safeParse({ ...validState, ingredients: [makeIngredient({ yieldPercent: 0 })] }).success,
    ).toBe(false)
  })
})

describe('licensePayloadSchema', () => {
  it('parses a valid payload with optional ref', () => {
    expect(licensePayloadSchema.safeParse({ plan: 'annual', iss: 'genka-dentaku', iat: 1, exp: 2 }).success).toBe(true)
    expect(
      licensePayloadSchema.safeParse({ plan: 'monthly', iss: 'genka-dentaku', iat: 1, exp: 2, ref: 'cs_123' }).success,
    ).toBe(true)
  })
  it('rejects an unknown plan and non-positive/int timestamps', () => {
    expect(licensePayloadSchema.safeParse({ plan: 'weekly', iss: 'x', iat: 1, exp: 2 }).success).toBe(false)
    expect(licensePayloadSchema.safeParse({ plan: 'annual', iss: 'x', iat: 0, exp: 2 }).success).toBe(false)
    expect(licensePayloadSchema.safeParse({ plan: 'annual', iss: 'x', iat: 1.5, exp: 2 }).success).toBe(false)
  })
})
