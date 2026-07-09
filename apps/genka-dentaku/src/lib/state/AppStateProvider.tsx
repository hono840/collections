'use client'

/**
 * App state Context + actions (architecture §4.5). Client-only.
 *
 * Classification-first (architecture §4.3): on mount we run loadCanonicalState() once to classify
 * the stored payload. While loadIssue is 'corrupt' or 'future' we GATE every mutation and every
 * persist until a resolveRecovery action completes — structurally preventing the reactive store's
 * silent DEFAULT_STATE fallback from overwriting corrupt/future raw data before the user has
 * exported/quarantined it.
 *
 * exTax invariant: purchasePriceExTax / sellPriceExTax are ONLY ever written via toExTax
 * (normalizeIngredient / normalizeMenu are the single writers) so input meta and normalized values
 * can never drift (architecture §3 / §14).
 *
 * Derived values (cost / rate / margin / color / order) are NEVER held here — use-dashboard /
 * use-menu-summary recompute them from `state`, which is what guarantees THE WEDGE.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CanonicalState, Ingredient, Menu, RecipeItem, Settings } from '@/lib/domain/schema'
import { toExTax } from '@/lib/domain/tax'
import { selectMenusUsingIngredient } from '@/lib/domain/selectors'
import { FREE_MAX_MENUS } from '@/lib/constants/limits'
import { newId } from '@/lib/utils/id'
import { DEFAULT_STATE, loadCanonicalState, quarantineCorrupt, type LoadResult } from '@/lib/storage/canonical-store'
import { useCanonicalStore } from '@/lib/hooks/use-canonical-store'
import { verifyLicenseKey, type LicenseStatus } from '@/lib/license/verify'
import { createSampleState } from '@/lib/sample/sample-data'
import { downloadRawText } from '@/lib/backup/export-json'

const MS_PER_DAY = 86_400_000

/** User-supplied ingredient fields (id / normalized ex-tax / flags / timestamps are derived). */
export interface IngredientInput {
  name: string
  inputPrice: number
  priceIncludesTax: boolean
  taxRate: number
  purchaseQuantity: number
  unit: string
  dimension: Ingredient['dimension']
  yieldPercent: number
}

/** User-supplied menu fields (id / normalized ex-tax / flags / timestamps are derived). */
export interface MenuInput {
  name: string
  sellInputPrice: number
  sellPriceIncludesTax: boolean
  sellTaxRate: number
  items: RecipeItem[]
}

export interface AppStateActions {
  addIngredient(input: IngredientInput): void
  updateIngredient(id: string, patch: Partial<IngredientInput>): void
  removeIngredient(id: string): { removed: true } | { removed: false; usedByMenuCount: number }
  confirmRemoveIngredient(id: string): void
  addMenu(input: MenuInput): { ok: true } | { ok: false; reason: 'free-limit' }
  updateMenu(id: string, patch: Partial<MenuInput>): void
  duplicateMenu(id: string): { ok: true } | { ok: false; reason: 'free-limit' }
  removeMenu(id: string): void
  addLine(menuId: string, line: RecipeItem): void
  updateLine(menuId: string, index: number, patch: Partial<RecipeItem>): void
  removeLine(menuId: string, index: number): void
  updateSettings(patch: Partial<Settings>): void
  applyLicenseKey(key: string): Promise<LicenseStatus>
  clearLicense(): void
  seedSamples(): void
  clearSamples(): void
  resetAll(): void
  importState(state: CanonicalState, mode: 'replace' | 'merge'): void
  /** Release the recovery gate after the user has exported / reset / restored (architecture §4.3). */
  resolveRecovery(kind: 'download-done' | 'reset' | 'restore'): void
}

export interface AppStateValue {
  state: CanonicalState
  mounted: boolean
  loadIssue: LoadResult['status']
  license: LicenseStatus
  /** Set when a persist fails from a full localStorage (PRD 8.7). Dismissible; re-armed on the next failure. */
  saveError: 'quota' | null
  dismissSaveError: () => void
  /** Set when the device clock appears to have rolled back vs lastSeenDate (PRD 5.4). Session-dismissible. */
  clockWarning: boolean
  dismissClockWarning: () => void
  actions: AppStateActions
}

const NONE_LICENSE: LicenseStatus = {
  status: 'none',
  plan: null,
  issuedAt: null,
  expiresAt: null,
  isPro: false,
  inGrace: false,
  daysRemaining: null,
}

const AppStateContext = createContext<AppStateValue | null>(null)

function nowIso(): string {
  return new Date().toISOString()
}

function freshDefault(): CanonicalState {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as CanonicalState
}

// ── single writers for the ex-tax invariant ──

function normalizeIngredient(input: IngredientInput, base?: Ingredient): Ingredient {
  const ts = nowIso()
  return {
    id: base?.id ?? newId(),
    name: input.name,
    purchasePriceExTax: toExTax(input.inputPrice, input.priceIncludesTax, input.taxRate),
    inputPrice: input.inputPrice,
    priceIncludesTax: input.priceIncludesTax,
    taxRate: input.taxRate,
    purchaseQuantity: input.purchaseQuantity,
    unit: input.unit,
    dimension: input.dimension,
    yieldPercent: input.yieldPercent,
    isSample: base?.isSample ?? false,
    createdAt: base?.createdAt ?? ts,
    updatedAt: ts,
  }
}

function normalizeMenu(input: MenuInput, base?: Menu): Menu {
  const ts = nowIso()
  return {
    id: base?.id ?? newId(),
    name: input.name,
    sellPriceExTax: toExTax(input.sellInputPrice, input.sellPriceIncludesTax, input.sellTaxRate),
    sellInputPrice: input.sellInputPrice,
    sellPriceIncludesTax: input.sellPriceIncludesTax,
    sellTaxRate: input.sellTaxRate,
    items: input.items,
    isSample: base?.isSample ?? false,
    createdAt: base?.createdAt ?? ts,
    updatedAt: ts,
  }
}

function ingredientInputOf(ing: Ingredient): IngredientInput {
  return {
    name: ing.name,
    inputPrice: ing.inputPrice,
    priceIncludesTax: ing.priceIncludesTax,
    taxRate: ing.taxRate,
    purchaseQuantity: ing.purchaseQuantity,
    unit: ing.unit,
    dimension: ing.dimension,
    yieldPercent: ing.yieldPercent,
  }
}

function menuInputOf(menu: Menu): MenuInput {
  return {
    name: menu.name,
    sellInputPrice: menu.sellInputPrice,
    sellPriceIncludesTax: menu.sellPriceIncludesTax,
    sellTaxRate: menu.sellTaxRate,
    items: menu.items,
  }
}

/** Re-normalize every ex-tax field from input meta (import / migration path, architecture §14). */
function renormalizeState(state: CanonicalState): CanonicalState {
  return {
    ...state,
    ingredients: state.ingredients.map((ing) => ({
      ...ing,
      purchasePriceExTax: toExTax(ing.inputPrice, ing.priceIncludesTax, ing.taxRate),
    })),
    menus: state.menus.map((menu) => ({
      ...menu,
      sellPriceExTax: toExTax(menu.sellInputPrice, menu.sellPriceIncludesTax, menu.sellTaxRate),
    })),
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // Ephemeral, provider-level notice state (not persisted): quota-save failure + clock rollback.
  const [saveError, setSaveError] = useState<'quota' | null>(null)
  const [clockWarning, setClockWarning] = useState(false)
  const handleSaveError = useCallback(() => setSaveError('quota'), [])
  const dismissSaveError = useCallback(() => setSaveError(null), [])
  const dismissClockWarning = useCallback(() => setClockWarning(false), [])

  const { state, setState, mounted } = useCanonicalStore(handleSaveError)
  const [recovered, setRecovered] = useState(false)
  const [license, setLicense] = useState<LicenseStatus>(NONE_LICENSE)

  // Classification-first (architecture §4.3), hydration-safe: 'empty' until mounted, then the real
  // classification is derived once (no setState-in-effect). `recovered` releases the gate.
  const classification = useMemo<LoadResult>(
    () => (mounted ? loadCanonicalState() : { status: 'empty' }),
    [mounted],
  )
  const loadIssue: LoadResult['status'] = recovered ? 'ok' : classification.status
  const gated = loadIssue === 'corrupt' || loadIssue === 'future'

  // Refs let the (stable) action callbacks read the latest values. Synced in an effect so we never
  // touch ref.current during render.
  const stateRef = useRef(state)
  const licenseRef = useRef(license)
  const gatedRef = useRef(gated)
  const recoveryRawRef = useRef<string | null>(null)
  useEffect(() => {
    stateRef.current = state
    licenseRef.current = license
    gatedRef.current = gated
  })
  useEffect(() => {
    recoveryRawRef.current =
      classification.status === 'corrupt' || classification.status === 'future' ? classification.rawText : null
  }, [classification])

  // Verify the stored key on mount / key change; record last-seen + soft clock-rollback detection
  // (裁定2: warn only, never lock). setState lives inside the async .then (no sync setState-in-effect).
  useEffect(() => {
    if (!mounted) return
    const key = state.license.key
    let activeCheck = true
    verifyLicenseKey(key).then((status) => {
      if (!activeCheck) return
      setLicense(status)
      if (key !== null && !gatedRef.current) {
        const today = nowIso()
        // Soft clock-rollback detection (裁定2 / PRD 5.4): today is >1 day before the last-seen date.
        // Never lock — surface a dismissible info banner and keep the console warning (no setState in-updater).
        const lastSeen = stateRef.current.license.lastSeenDate
        if (lastSeen && Date.parse(today) < Date.parse(lastSeen) - MS_PER_DAY) {
          console.warn('[genka] clock rollback detected relative to lastSeenDate (soft warning only)')
          setClockWarning(true)
        }
        setState((prev) => {
          if (prev.license.key === null || prev.license.lastSeenDate === today) return prev
          return { ...prev, license: { ...prev.license, lastSeenDate: today } }
        })
      }
    })
    return () => {
      activeCheck = false
    }
  }, [mounted, state.license.key, setState])

  const actions = useMemo<AppStateActions>(() => {
    const guardMutation = () => gatedRef.current

    return {
      addIngredient(input) {
        if (guardMutation()) return
        const ingredient = normalizeIngredient(input)
        setState((prev) => ({ ...prev, ingredients: [...prev.ingredients, ingredient] }))
      },
      updateIngredient(id, patch) {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          ingredients: prev.ingredients.map((ing) =>
            ing.id === id ? normalizeIngredient({ ...ingredientInputOf(ing), ...patch }, ing) : ing,
          ),
        }))
      },
      removeIngredient(id) {
        if (guardMutation()) return { removed: false, usedByMenuCount: 0 }
        const usedByMenuCount = selectMenusUsingIngredient(stateRef.current, id).length
        if (usedByMenuCount > 0) return { removed: false, usedByMenuCount }
        setState((prev) => ({ ...prev, ingredients: prev.ingredients.filter((ing) => ing.id !== id) }))
        return { removed: true }
      },
      confirmRemoveIngredient(id) {
        if (guardMutation()) return
        setState((prev) => ({ ...prev, ingredients: prev.ingredients.filter((ing) => ing.id !== id) }))
      },
      addMenu(input) {
        if (guardMutation()) return { ok: false, reason: 'free-limit' }
        const menu = normalizeMenu(input)
        // Enforce the Free cap INSIDE the updater against the freshest `prev` so two adds in the same
        // tick can't both slip past a stale stateRef; the result reflects what actually persisted.
        let added = false
        setState((prev) => {
          if (!licenseRef.current.isPro && prev.menus.length >= FREE_MAX_MENUS) return prev
          added = true
          return { ...prev, menus: [...prev.menus, menu] }
        })
        return added ? { ok: true } : { ok: false, reason: 'free-limit' }
      },
      updateMenu(id, patch) {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === id ? normalizeMenu({ ...menuInputOf(menu), ...patch }, menu) : menu,
          ),
        }))
      },
      duplicateMenu(id) {
        if (guardMutation()) return { ok: false, reason: 'free-limit' }
        const source = stateRef.current.menus.find((menu) => menu.id === id)
        if (!source) return { ok: true }
        const copy = normalizeMenu({ ...menuInputOf(source), name: `${source.name} (コピー)` })
        // Cap enforced inside the updater (see addMenu) so same-tick duplicates can't exceed the limit.
        let added = false
        setState((prev) => {
          if (!licenseRef.current.isPro && prev.menus.length >= FREE_MAX_MENUS) return prev
          added = true
          return { ...prev, menus: [...prev.menus, copy] }
        })
        return added ? { ok: true } : { ok: false, reason: 'free-limit' }
      },
      removeMenu(id) {
        if (guardMutation()) return
        setState((prev) => ({ ...prev, menus: prev.menus.filter((menu) => menu.id !== id) }))
      },
      addLine(menuId, line) {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === menuId ? { ...menu, items: [...menu.items, line], updatedAt: nowIso() } : menu,
          ),
        }))
      },
      updateLine(menuId, index, patch) {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === menuId
              ? {
                  ...menu,
                  items: menu.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                  updatedAt: nowIso(),
                }
              : menu,
          ),
        }))
      },
      removeLine(menuId, index) {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === menuId
              ? { ...menu, items: menu.items.filter((_, i) => i !== index), updatedAt: nowIso() }
              : menu,
          ),
        }))
      },
      updateSettings(patch) {
        if (guardMutation()) return
        setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
      },
      async applyLicenseKey(key) {
        const status = await verifyLicenseKey(key)
        setLicense(status)
        // Persist the key unless it is unusable; keep 'unsupported' keys for a later re-check.
        if (!gatedRef.current && status.status !== 'invalid' && status.status !== 'none') {
          setState((prev) => ({ ...prev, license: { key, lastSeenDate: nowIso() } }))
        }
        return status
      },
      clearLicense() {
        if (guardMutation()) return
        setLicense(NONE_LICENSE)
        setState((prev) => ({ ...prev, license: { key: null, lastSeenDate: prev.license.lastSeenDate } }))
      },
      seedSamples() {
        if (guardMutation()) return
        setState((prev) => {
          const { ingredients, menus } = createSampleState()
          const existingIngredientIds = new Set(prev.ingredients.map((ing) => ing.id))
          const existingMenuIds = new Set(prev.menus.map((menu) => menu.id))
          return {
            ...prev,
            ingredients: [...prev.ingredients, ...ingredients.filter((ing) => !existingIngredientIds.has(ing.id))],
            menus: [...prev.menus, ...menus.filter((menu) => !existingMenuIds.has(menu.id))],
            meta: { ...prev.meta, sampleSeeded: true },
          }
        })
      },
      clearSamples() {
        if (guardMutation()) return
        setState((prev) => ({
          ...prev,
          ingredients: prev.ingredients.filter((ing) => !ing.isSample),
          menus: prev.menus.filter((menu) => !menu.isSample),
        }))
      },
      resetAll() {
        setLicense(NONE_LICENSE)
        setState(freshDefault())
      },
      importState(next, mode) {
        const normalized = renormalizeState(next)
        if (mode === 'replace') {
          setState(normalized)
        } else {
          // 'merge' semantics: arrays (ingredients/menus) are unioned by id (existing rows win on
          // collision); scalars (settings/meta/license) are REPLACED by the imported payload. Note:
          // every current UI call site imports with 'replace' — 'merge' is kept for partial-restore.
          setState((prev) => {
            const ingredientIds = new Set(prev.ingredients.map((ing) => ing.id))
            const menuIds = new Set(prev.menus.map((menu) => menu.id))
            return {
              ...normalized,
              ingredients: [
                ...prev.ingredients,
                ...normalized.ingredients.filter((ing) => !ingredientIds.has(ing.id)),
              ],
              menus: [...prev.menus, ...normalized.menus.filter((menu) => !menuIds.has(menu.id))],
            }
          })
        }
        // Importing good data is the recovery "restore" path — release the gate.
        setRecovered(true)
      },
      resolveRecovery(kind) {
        const raw = recoveryRawRef.current
        if (raw !== null) {
          quarantineCorrupt(raw) // preserve corrupt/future raw to :backup before any overwrite
          if (kind === 'download-done') downloadRawText(raw, `genka-dentaku-corrupt-${Date.now()}.json`)
        }
        if (kind === 'reset') {
          setLicense(NONE_LICENSE)
          setState(freshDefault())
        }
        // 'restore' expects importState to run separately; releasing the gate lets it persist.
        setRecovered(true)
      },
    }
  }, [setState])

  const value = useMemo<AppStateValue>(
    () => ({ state, mounted, loadIssue, license, saveError, dismissSaveError, clockWarning, dismissClockWarning, actions }),
    [state, mounted, loadIssue, license, saveError, dismissSaveError, clockWarning, dismissClockWarning, actions],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

/** Read the app state. Throws when used outside the provider. */
export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext)
  if (value === null) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return value
}
