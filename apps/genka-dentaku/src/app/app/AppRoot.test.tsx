import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CanonicalState } from '@/lib/domain/schema'
import { STORAGE_KEY } from '@/lib/constants/storage-keys'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { createSampleState } from '@/lib/sample/sample-data'

// Decouple from Web Crypto: verification always resolves to Free ('none'). A non-null key still
// exercises the last-seen / clock-rollback path (which only requires key !== null).
vi.mock('@/lib/license/verify', () => ({
  verifyLicenseKey: vi.fn(async () => ({
    status: 'none',
    plan: null,
    issuedAt: null,
    expiresAt: null,
    isPro: false,
    inGrace: false,
    daysRemaining: null,
  })),
  isEd25519Supported: vi.fn(async () => true),
}))

import { AppRoot } from './AppRoot'

/** Seed a valid canonical state (sample ingredients + 唐揚げ定食) into localStorage. */
function seedSampleState() {
  const { ingredients, menus } = createSampleState()
  const state: CanonicalState = {
    ...DEFAULT_STATE,
    meta: { onboardingDone: true, sampleSeeded: true },
    ingredients,
    menus,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function renderApp() {
  render(<AppRoot />)
  // Flush mount effects (classification load + async license verification + Ed25519 probe).
  await act(async () => {})
}

describe('AppRoot — THE WEDGE integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedSampleState()
  })

  it('recomputes 唐揚げ定食 (24.8% good → 30.9% caution) when 鶏もも肉 price is edited — no reload, no button', async () => {
    await renderApp()

    // Dashboard: the sample menu starts green at 24.8%.
    const rowBefore = screen.getByRole('button', { name: /唐揚げ定食/ })
    expect(within(rowBefore).getByText('24.8%')).toBeInTheDocument()
    expect(within(rowBefore).getByText('良好')).toBeInTheDocument()

    // Go to the 食材 tab and edit the chicken purchase price 900 → 1200 inline.
    await userEvent.click(screen.getByRole('button', { name: '食材' }))
    const priceInput = screen.getByLabelText('鶏もも肉の購入価格')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1200')

    // The recalc feedback fires (1 dependent menu).
    expect(screen.getByText('1件のメニューを再計算しました')).toBeInTheDocument()

    // Back to the dashboard: the SAME menu is now amber at 30.9% — pure selector propagation.
    await userEvent.click(screen.getByRole('button', { name: 'ダッシュボード' }))
    const rowAfter = screen.getByRole('button', { name: /唐揚げ定食/ })
    expect(within(rowAfter).getByText('30.9%')).toBeInTheDocument()
    expect(within(rowAfter).getByText('注意')).toBeInTheDocument()
    expect(within(rowAfter).queryByText('良好')).not.toBeInTheDocument()
  })

  it('renders the dashboard KPI panel from the seeded state', async () => {
    await renderApp()
    expect(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument()
    expect(screen.getByText('メニュー数')).toBeInTheDocument()
    // TrustBadge is always present in the header (compact = icon with the privacy text as its name).
    expect(screen.getByRole('img', { name: 'データは端末内のみ' })).toBeInTheDocument()
  })

  it('exposes the CSV/PDF export section in 設定 and gates it for Free users (PRD 4.f)', async () => {
    await renderApp()
    await userEvent.click(screen.getByRole('button', { name: '設定' }))

    expect(screen.getByRole('heading', { name: 'エクスポート（CSV・PDF）' })).toBeInTheDocument()

    // Free → clicking a locked CSV control opens the inline upgrade gate (no download).
    await userEvent.click(screen.getByRole('button', { name: 'メニュー一覧CSV' }))
    expect(screen.getByText('CSV出力はProです')).toBeInTheDocument()
  })

  it('surfaces a dismissible save-failure banner with a JSON backup CTA when storage is full (PRD 8.7)', async () => {
    await renderApp()

    // The seed already succeeded; make the NEXT persist throw a quota error.
    const quota = new DOMException('quota', 'QuotaExceededError')
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota
    })

    // A mutation now fails to persist — the change must not silently revert; it must be surfaced.
    await userEvent.click(screen.getByRole('button', { name: '食材' }))
    const priceInput = screen.getByLabelText('鶏もも肉の購入価格')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1')

    expect(await screen.findByText(/保存に失敗しました（容量不足）/)).toBeInTheDocument()
    const backupCta = screen.getByRole('button', { name: 'JSONバックアップを保存' })
    expect(backupCta).toBeInTheDocument()

    setItemSpy.mockRestore()

    // Dismissible.
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByText(/保存に失敗しました（容量不足）/)).not.toBeInTheDocument()
  })

  it('shows a session-dismissible clock-rollback banner when the device date is in the past (PRD 5.4)', async () => {
    // A stored license key + a lastSeenDate ~2 days in the FUTURE relative to now = clock rolled back.
    const { ingredients, menus } = createSampleState()
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString()
    const state: CanonicalState = {
      ...DEFAULT_STATE,
      meta: { onboardingDone: true, sampleSeeded: true },
      ingredients,
      menus,
      license: { key: 'GENKA-any-key', lastSeenDate: future },
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    await renderApp()

    expect(await screen.findByText(/端末の日時が過去に戻っています/)).toBeInTheDocument()

    // Non-blocking + session-dismissible.
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByText(/端末の日時が過去に戻っています/)).not.toBeInTheDocument()
  })
})
