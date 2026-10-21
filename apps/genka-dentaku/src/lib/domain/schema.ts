/**
 * Domain model — the single source of truth for the type contract (architecture §3).
 * Every zod schema here derives its TypeScript type via `z.infer`; domain pure functions,
 * storage and UI all import those types. Runtime validation of localStorage / imports also
 * flows through these schemas. Entity names mirror PRD 第9章 (Ingredient / Menu / RecipeItem /
 * Settings / License / Meta). zod v4 API only.
 */
import { z } from 'zod'

/** Migration baseline, held on the localStorage root (PRD 9.3). */
export const CURRENT_SCHEMA_VERSION = 1 as const

/** Unit dimension. */
export const dimensionSchema = z.enum(['weight', 'volume', 'count'])

/**
 * Weight/volume use fixed, coefficient-convertible units; count units are free-form
 * (個/枚/束/本/袋/玉/丁/合…) and never cross-convert (PRD 0.4 / §5.1).
 * These arrays are the single source of truth; constants/units.ts re-exports them.
 */
export const WEIGHT_UNITS = ['g', 'kg'] as const
export const VOLUME_UNITS = ['ml', 'L'] as const
export const COUNT_UNIT_PRESETS = ['個', '枚', '束', '本', '袋', '玉', '丁', '合', '杯', '尾', 'パック'] as const

/** A unit is any non-empty string; validity is cross-checked against the dimension per Ingredient. */
export const unitSchema = z.string().min(1)

/** Tax rate. 8 | 10 are the practical values; the boundary is guarded to 0..100. */
const taxRateSchema = z.number().min(0).max(100)

/** Ingredient (the effective unit price is never stored — it is recomputed on demand). */
export const ingredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(60),
    purchasePriceExTax: z.number().nonnegative(), // ex-tax normalized (the calculation source of truth). yen
    inputPrice: z.number().nonnegative(), // raw user-entered amount (for re-display / re-edit). yen
    priceIncludesTax: z.boolean(), // whether the input was tax-inclusive
    taxRate: taxRateSchema, // 8 | 10 etc.
    purchaseQuantity: z.number().positive(), // purchased amount (>0: zero-division guard)
    unit: unitSchema, // g/kg/ml/L/個… (must be consistent with dimension)
    dimension: dimensionSchema,
    yieldPercent: z.number().min(1).max(100), // yield 1..100 (0 forbidden = zero-division guard)
    isSample: z.boolean(), // sample-origin (for bulk clear)
    createdAt: z.string(), // ISO8601
    updatedAt: z.string(),
  })
  .superRefine((ing, ctx) => {
    if (ing.dimension === 'weight' && !(WEIGHT_UNITS as readonly string[]).includes(ing.unit)) {
      ctx.addIssue({ code: 'custom', path: ['unit'], message: 'weight の単位は g|kg のみ' })
    }
    if (ing.dimension === 'volume' && !(VOLUME_UNITS as readonly string[]).includes(ing.unit)) {
      ctx.addIssue({ code: 'custom', path: ['unit'], message: 'volume の単位は ml|L のみ' })
    }
    // count accepts any non-empty string (個≠枚≠束…, no conversion — see §5.1).
  })

/** Recipe line (quantity 0 allowed = PRD 8.10). Unit compatibility is decided by the engine at cost time. */
export const recipeItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: unitSchema,
})

/** Menu (cost / cost-rate / margin / signal color are never stored — recomputed on demand). */
export const menuSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  sellPriceExTax: z.number().nonnegative(), // ex-tax normalized. 0 = 要確認
  sellInputPrice: z.number().nonnegative(),
  sellPriceIncludesTax: z.boolean(),
  sellTaxRate: taxRateSchema, // 10 | 8
  items: z.array(recipeItemSchema),
  isSample: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Settings (thresholds / tax defaults / simulation rounding). */
export const settingsSchema = z
  .object({
    alertWarnThreshold: z.number().min(0).max(100), // default 30 (green/yellow boundary)
    alertDangerThreshold: z.number().min(0).max(100), // default 35 (yellow/red boundary)
    defaultIngredientTaxRate: taxRateSchema, // default 8
    defaultSellTaxRate: taxRateSchema, // default 10
    defaultPriceIncludesTax: z.boolean(), // default true (tax-inclusive input)
    simRoundingUnit: z.union([z.literal(1), z.literal(10), z.literal(50), z.literal(100)]), // default 10
    currency: z.literal('JPY'),
  })
  .refine((s) => s.alertWarnThreshold < s.alertDangerThreshold, {
    message: 'alertWarnThreshold は alertDangerThreshold より小さくすること',
    path: ['alertWarnThreshold'],
  })

/**
 * License (persisted). `key` is the source of truth; plan/issuedAt/expiresAt/status are
 * re-derived on every launch via signature verification and never persisted — this keeps
 * (1) the "never store derived values" rule and (2) tamper-resistance (hand-editing
 * localStorage cannot fake Pro). PRD 5.4 / 裁定2.
 */
export const licenseSchema = z.object({
  key: z.string().nullable(), // signed key (GENKA-…). null while unlocked
  lastSeenDate: z.string().nullable(), // soft clock-rollback detection
})

/** Meta (onboarding / sample-seed flags). */
export const metaSchema = z.object({
  onboardingDone: z.boolean(),
  sampleSeeded: z.boolean(),
})

/** Persisted root state (all under the single key `genka-dentaku`). */
export const canonicalStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  meta: metaSchema,
  settings: settingsSchema,
  ingredients: z.array(ingredientSchema),
  menus: z.array(menuSchema),
  license: licenseSchema,
})

/** Signed payload carried inside a license key (§6). */
export const licensePayloadSchema = z.object({
  plan: z.enum(['monthly', 'annual']),
  iss: z.string().min(1), // issuer id (e.g. 'genka-dentaku')
  iat: z.number().int().positive(), // issued-at epoch seconds
  exp: z.number().int().positive(), // expiry epoch seconds (monthly=+38d / annual=+373d at mint)
  ref: z.string().optional(), // purchase reference (e.g. Stripe order id — optional deterrent)
})

// ── z.infer types (imported across the whole app) ──
export type Dimension = z.infer<typeof dimensionSchema>
export type Unit = z.infer<typeof unitSchema>
export type Ingredient = z.infer<typeof ingredientSchema>
export type RecipeItem = z.infer<typeof recipeItemSchema>
export type Menu = z.infer<typeof menuSchema>
export type Settings = z.infer<typeof settingsSchema>
export type License = z.infer<typeof licenseSchema>
export type Meta = z.infer<typeof metaSchema>
export type CanonicalState = z.infer<typeof canonicalStateSchema>
export type LicensePayload = z.infer<typeof licensePayloadSchema>
