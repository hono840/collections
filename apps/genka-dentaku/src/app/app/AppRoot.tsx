'use client'
/**
 * AppRoot — the tool's client island (architecture §4.5 / §9). Owns the AppStateProvider, the tab +
 * view state, and composes every tool organism inside AppShell. Nothing derived is stored: dashboard
 * KPIs / summaries and the recipe editor's live cost are recomputed from CanonicalState via the pure
 * selectors on every render — which is what makes THE WEDGE work (edit one price → every dependent
 * menu updates instantly).
 *
 * Boot order (C10 / architecture §4.3): skeleton until mounted → DataRecoveryDialog gate first if the
 * store is corrupt/future → OnboardingSheet on an empty first run → the normal shell.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  selectDashboardMenus,
  selectDashboardKpi,
  selectIngredientsById,
  selectMenuSummary,
  selectMenusUsingIngredient,
} from '@/lib/domain'
import type { CanonicalState } from '@/lib/domain/schema'
import { AppStateProvider, useAppState } from '@/lib/hooks/use-app-state'
import { useLicense } from '@/lib/hooks/use-license'
import { downloadBackup } from '@/lib/backup/export-json'
import { isEd25519Supported } from '@/lib/license/verify'
import { Button } from '@/components/atoms/Button'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Toast } from '@/components/molecules/Toast'
import type {
  IngredientFormSubmit,
  IngredientFormValues,
} from '@/components/molecules/IngredientForm'
import { AppShell } from '@/components/templates/AppShell'
import { AppHeader } from '@/components/organisms/AppHeader'
import { BottomNav, type NavTab } from '@/components/organisms/BottomNav'
import { KpiSummary } from '@/components/organisms/KpiSummary'
import { DashboardMenuList } from '@/components/organisms/DashboardMenuList'
import { IngredientListPanel } from '@/components/organisms/IngredientListPanel'
import { IngredientFormSheet } from '@/components/organisms/IngredientFormSheet'
import { RecipeEditor } from '@/components/organisms/RecipeEditor'
import { SimulationPanel, type SimMenu } from '@/components/organisms/SimulationPanel'
import { UpgradeGateBanner } from '@/components/organisms/UpgradeGateBanner'
import { OnboardingSheet } from '@/components/organisms/OnboardingSheet'
import { SemaphoreLegend } from '@/components/organisms/SemaphoreLegend'
import { SettingsPanel } from '@/components/organisms/SettingsPanel'
import { RecalcIndicator } from '@/components/organisms/RecalcIndicator'
import { DataRecoveryDialog } from '@/components/organisms/DataRecoveryDialog'
import { BackupPanel } from '@/components/organisms/BackupPanel'
import { Sheet } from '@/components/organisms/Sheet'

const RECALC_MS = 1400
const TOAST_MS = 2600

type ToastState = { message: string; tone?: 'info' | 'success' | 'danger' } | null

function SkeletonShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg sm:border-x sm:border-border">
      <div className="h-14 border-b border-border bg-surface" />
      <div className="flex-1 space-y-3 p-4">
        <Skeleton h={148} radius="lg" />
        <Skeleton h={44} />
        <Skeleton h={72} />
        <Skeleton h={72} />
        <Skeleton h={72} />
      </div>
    </div>
  )
}

function AppRootInner() {
  const { state, mounted, loadIssue, actions } = useAppState()
  const license = useLicense()
  const { alertWarnThreshold: warn, alertDangerThreshold: danger } = state.settings

  const [tab, setTab] = useState<NavTab>('dashboard')
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [pendingNewMenu, setPendingNewMenu] = useState(false)
  const [ingredientSheet, setIngredientSheet] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null })
  const [sim, setSim] = useState<{ open: boolean; mode: 'single' | 'bulk'; menuId: string | null }>({ open: false, mode: 'single', menuId: null })
  const [legendOpen, setLegendOpen] = useState(false)
  const [gateBanner, setGateBanner] = useState<'free-limit' | null>(null)
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [recalc, setRecalc] = useState<{ visible: boolean; count: number }>({ visible: false, count: 0 })
  const [dashQuery, setDashQuery] = useState('')
  const [dashSort, setDashSort] = useState('rate-desc')
  const [ingQuery, setIngQuery] = useState('')
  const [ingSort, setIngSort] = useState('name-asc')
  const [ed25519, setEd25519] = useState(true)

  const recalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const summaries = useMemo(() => selectDashboardMenus(state), [state])
  const kpi = useMemo(() => selectDashboardKpi(state), [state])
  const byId = useMemo(() => selectIngredientsById(state), [state])
  const hasSamples = useMemo(
    () => state.ingredients.some((i) => i.isSample) || state.menus.some((m) => m.isSample),
    [state],
  )

  // First-run onboarding gate: decide once when mounted (render-phase, like NumberInput's re-sync).
  // Captured once so seeding the sample — which fills the state — does not close the tip step.
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [shouldOnboard, setShouldOnboard] = useState(false)
  if (mounted && !onboardingChecked) {
    setOnboardingChecked(true)
    setShouldOnboard(!state.meta.onboardingDone && state.ingredients.length === 0 && state.menus.length === 0)
  }
  const gated = loadIssue === 'corrupt' || loadIssue === 'future'
  const showOnboarding = mounted && !gated && !dismissedOnboarding && shouldOnboard

  // Open the recipe editor once the newly created menu lands in state (render-phase, guarded).
  if (pendingNewMenu) {
    const last = state.menus[state.menus.length - 1]
    if (last) {
      setPendingNewMenu(false)
      setEditingMenuId(last.id)
    }
  }
  // Leave the editor if the open menu was deleted elsewhere (e.g. another tab).
  if (editingMenuId && !state.menus.some((m) => m.id === editingMenuId)) {
    setEditingMenuId(null)
  }

  // Probe Ed25519 support once (license UX).
  useEffect(() => {
    isEd25519Supported().then(setEd25519)
  }, [])

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => () => { if (recalcTimer.current) clearTimeout(recalcTimer.current) }, [])

  const showToast = (message: string, tone?: 'info' | 'success' | 'danger') => setToast({ message, tone })

  function triggerRecalc(id: string) {
    const count = selectMenusUsingIngredient(state, id).length
    setRecalc({ visible: true, count })
    if (recalcTimer.current) clearTimeout(recalcTimer.current)
    recalcTimer.current = setTimeout(() => setRecalc((r) => ({ ...r, visible: false })), RECALC_MS)
  }

  function handleQuickEditPrice(id: string, inputPrice: number) {
    actions.updateIngredient(id, { inputPrice })
    triggerRecalc(id)
  }

  function handleNewMenu() {
    if (!license.canAddMenu(state.menus.length)) {
      setTab('dashboard')
      setGateBanner('free-limit')
      return
    }
    const result = actions.addMenu({
      name: '新しいメニュー',
      sellInputPrice: 0,
      sellPriceIncludesTax: state.settings.defaultPriceIncludesTax,
      sellTaxRate: state.settings.defaultSellTaxRate,
      items: [],
    })
    if (!result.ok) {
      setTab('dashboard')
      setGateBanner('free-limit')
      return
    }
    setGateBanner(null)
    setPendingNewMenu(true)
  }

  function handleIngredientSubmit(values: IngredientFormSubmit) {
    if (ingredientSheet.editingId) actions.updateIngredient(ingredientSheet.editingId, values)
    else actions.addIngredient(values)
    setIngredientSheet({ open: false, editingId: null })
    showToast('保存しました', 'success')
  }

  function handleIngredientDelete(id: string) {
    actions.confirmRemoveIngredient(id)
    setIngredientSheet({ open: false, editingId: null })
    showToast('食材を削除しました')
  }

  function applyNewSell(menuId: string, newSellExTax: number) {
    const menu = state.menus.find((m) => m.id === menuId)
    actions.updateMenu(menuId, { sellInputPrice: newSellExTax, sellPriceIncludesTax: false, sellTaxRate: menu?.sellTaxRate ?? 10 })
  }

  // Recovery gate blocks the whole app until resolved (architecture §4.3).
  if (!mounted) return <SkeletonShell />
  if (gated) {
    return (
      <AppShell
        header={<AppHeader title="原価電卓" />}
        nav={<BottomNav active="dashboard" onNavigate={() => {}} disabled />}
        overlay={
          <DataRecoveryDialog
            open
            issue={loadIssue === 'future' ? 'future' : 'corrupt'}
            onDownloadReset={() => actions.resolveRecovery('download-done')}
            onReset={() => actions.resolveRecovery('reset')}
            onRestore={(s: CanonicalState) => {
              actions.resolveRecovery('restore')
              actions.importState(s, 'replace')
            }}
          />
        }
      >
        <p className="py-16 text-center text-body-sm text-ink-muted">データの確認が必要です。</p>
      </AppShell>
    )
  }

  const editingMenu = editingMenuId ? state.menus.find((m) => m.id === editingMenuId) : undefined
  const editingSummary = editingMenu ? selectMenuSummary(editingMenu, byId, state.settings) : null
  const inEditor = Boolean(editingMenu && editingSummary)

  const simMenu = sim.menuId ? state.menus.find((m) => m.id === sim.menuId) : undefined
  const simSummary = simMenu ? selectMenuSummary(simMenu, byId, state.settings) : null
  const simTarget: SimMenu | undefined =
    simMenu && simSummary
      ? {
          id: simMenu.id,
          name: simMenu.name,
          costExTax: simSummary.costExTax,
          sellTaxRate: simMenu.sellTaxRate,
          currentSellIncTax: simSummary.sellIncTax,
          currentRatePercent1: simSummary.ratePercent1,
          currentStatus: simSummary.status,
        }
      : undefined
  const bulkMenus: SimMenu[] = summaries.map((s) => ({
    id: s.menu.id,
    name: s.menu.name,
    costExTax: s.costExTax,
    sellTaxRate: s.menu.sellTaxRate,
    currentSellIncTax: s.sellIncTax,
    currentRatePercent1: s.ratePercent1,
    currentStatus: s.status,
  }))

  const headerTitle = inEditor
    ? editingMenu?.name || 'メニュー'
    : tab === 'dashboard'
      ? 'ダッシュボード'
      : tab === 'ingredients'
        ? '食材'
        : '設定'

  let content: React.ReactNode
  if (inEditor && editingMenu && editingSummary) {
    const menuId = editingMenu.id
    content = (
      <RecipeEditor
        menu={editingMenu}
        summary={editingSummary}
        ingredients={state.ingredients}
        warn={warn}
        danger={danger}
        onChangeName={(name) => actions.updateMenu(menuId, { name })}
        onChangeSell={(patch) => actions.updateMenu(menuId, patch)}
        onAddLine={(ingredientId) => {
          const ing = byId.get(ingredientId)
          actions.addLine(menuId, { ingredientId, quantity: 0, unit: ing ? ing.unit : 'g' })
        }}
        onChangeLine={(index, line) => actions.updateLine(menuId, index, line)}
        onRemoveLine={(index) => actions.removeLine(menuId, index)}
        onSimulate={() => setSim({ open: true, mode: 'single', menuId })}
        onDelete={() => {
          actions.removeMenu(menuId)
          setEditingMenuId(null)
          showToast('メニューを削除しました')
        }}
        onGoToIngredients={() => {
          setEditingMenuId(null)
          setTab('ingredients')
        }}
      />
    )
  } else if (tab === 'dashboard') {
    content = (
      <div className="flex flex-col gap-4">
        <KpiSummary kpi={kpi} warn={warn} danger={danger} onOpenLegend={() => setLegendOpen(true)} />
        {gateBanner === 'free-limit' && (
          <UpgradeGateBanner
            reason="free-limit"
            hasSamples={hasSamples}
            onDismiss={() => setGateBanner(null)}
            onManageMenus={() => setGateBanner(null)}
            onClearSamples={() => {
              actions.clearSamples()
              setGateBanner(null)
            }}
          />
        )}
        <DashboardMenuList
          summaries={summaries}
          dangerCount={kpi.dangerCount}
          query={dashQuery}
          onQueryChange={setDashQuery}
          sort={dashSort}
          onSortChange={setDashSort}
          onOpenMenu={setEditingMenuId}
          isPro={license.isPro}
          onBulkSimulate={() => setSim({ open: true, mode: 'bulk', menuId: null })}
          onSeedSample={() => actions.seedSamples()}
          onNewMenu={handleNewMenu}
        />
      </div>
    )
  } else if (tab === 'ingredients') {
    content = (
      <IngredientListPanel
        ingredients={state.ingredients}
        query={ingQuery}
        onQueryChange={setIngQuery}
        sort={ingSort}
        onSortChange={setIngSort}
        onQuickEditPrice={handleQuickEditPrice}
        onEdit={(id) => setIngredientSheet({ open: true, editingId: id })}
        onAdd={() => setIngredientSheet({ open: true, editingId: null })}
        onSeedSample={() => actions.seedSamples()}
        hasSamples={hasSamples}
        onClearSamples={() => actions.clearSamples()}
      />
    )
  } else {
    content = (
      <SettingsPanel
        settings={state.settings}
        onChangeSettings={(patch) => actions.updateSettings(patch)}
        license={license}
        ed25519Supported={ed25519}
        onVerifyLicense={(key) => actions.applyLicenseKey(key)}
        onClearLicense={() => actions.clearLicense()}
        hasSamples={hasSamples}
        onClearSamples={() => {
          actions.clearSamples()
          showToast('サンプルを削除しました')
        }}
        onResetAll={() => {
          actions.resetAll()
          setEditingMenuId(null)
          setTab('dashboard')
          showToast('全データを消去しました')
        }}
        backupSlot={
          <BackupPanel
            onExport={() => downloadBackup(state)}
            onImport={(s) => {
              actions.importState(s, 'replace')
              showToast('復元しました', 'success')
            }}
          />
        }
      />
    )
  }

  const editingIngredient = ingredientSheet.editingId ? state.ingredients.find((i) => i.id === ingredientSheet.editingId) : undefined
  const ingredientInitial: Partial<IngredientFormValues> | undefined = editingIngredient
    ? {
        name: editingIngredient.name,
        inputPrice: editingIngredient.inputPrice,
        priceIncludesTax: editingIngredient.priceIncludesTax,
        taxRate: editingIngredient.taxRate,
        purchaseQuantity: editingIngredient.purchaseQuantity,
        unit: editingIngredient.unit,
        yieldPercent: editingIngredient.yieldPercent,
      }
    : undefined
  const usedByMenuCount = ingredientSheet.editingId ? selectMenusUsingIngredient(state, ingredientSheet.editingId).length : 0

  const fab = !inEditor && tab === 'dashboard'
    ? (
        <Button variant="primary" iconStart={Plus} onClick={handleNewMenu} className="rounded-pill shadow-lg">
          新規メニュー
        </Button>
      )
    : undefined

  const overlay = (
    <>
      <RecalcIndicator visible={recalc.visible} count={recalc.count} />

      <IngredientFormSheet
        open={ingredientSheet.open}
        onClose={() => setIngredientSheet({ open: false, editingId: null })}
        editingId={ingredientSheet.editingId}
        initial={ingredientInitial}
        usedByMenuCount={usedByMenuCount}
        onSubmit={handleIngredientSubmit}
        onDelete={handleIngredientDelete}
      />

      <SimulationPanel
        open={sim.open}
        onClose={() => setSim((s) => ({ ...s, open: false }))}
        mode={sim.mode}
        isPro={license.isPro}
        roundingUnit={state.settings.simRoundingUnit}
        warn={warn}
        danger={danger}
        target={simTarget}
        onApplySingle={(newSellExTax) => {
          if (sim.menuId) applyNewSell(sim.menuId, newSellExTax)
          setSim((s) => ({ ...s, open: false }))
          showToast('売価を反映しました', 'success')
        }}
        menus={bulkMenus}
        onApplyBulk={(updates) => {
          updates.forEach((u) => applyNewSell(u.id, u.newSellExTax))
          setSim((s) => ({ ...s, open: false }))
          showToast(`${updates.length}件に反映しました`, 'success')
        }}
      />

      <OnboardingSheet
        open={showOnboarding}
        onLoadSample={() => actions.seedSamples()}
        onStartBlank={() => setDismissedOnboarding(true)}
        onFinish={() => setDismissedOnboarding(true)}
      />

      {legendOpen && (
        <Sheet open onClose={() => setLegendOpen(false)} title="凡例" variant="dialog">
          <SemaphoreLegend
            warn={warn}
            danger={danger}
            onEditThresholds={() => {
              setLegendOpen(false)
              setEditingMenuId(null)
              setTab('settings')
            }}
          />
        </Sheet>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[var(--z-toast)] flex justify-center px-4">
          <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  )

  return (
    <AppShell
      header={<AppHeader title={headerTitle} onBack={inEditor ? () => setEditingMenuId(null) : undefined} />}
      nav={
        <BottomNav
          active={tab}
          onNavigate={(t) => {
            setEditingMenuId(null)
            setGateBanner(null)
            setTab(t)
          }}
        />
      }
      fab={fab}
      overlay={overlay}
    >
      {content}
    </AppShell>
  )
}

export function AppRoot() {
  return (
    <AppStateProvider>
      <AppRootInner />
    </AppStateProvider>
  )
}
