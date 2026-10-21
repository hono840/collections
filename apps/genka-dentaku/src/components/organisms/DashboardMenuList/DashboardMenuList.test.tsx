import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Menu, MenuSummary, AlertStatus } from '@/lib/domain'
import { DashboardMenuList } from './DashboardMenuList'

function menu(id: string, name: string): Menu {
  return {
    id,
    name,
    sellPriceExTax: 818,
    sellInputPrice: 900,
    sellPriceIncludesTax: true,
    sellTaxRate: 10,
    items: [],
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function summary(id: string, name: string, ratePercent1: number | null, status: AlertStatus): MenuSummary {
  const needsAttention = ratePercent1 === null
  return {
    menu: menu(id, name),
    costExTax: 200,
    costYen: 200,
    sellExTax: needsAttention ? null : 818,
    sellIncTax: needsAttention ? null : 900,
    rate: ratePercent1 === null ? null : ratePercent1 / 100,
    ratePercent1,
    marginExTax: needsAttention ? null : 615,
    status,
    issues: [],
    needsAttention,
  }
}

const BASE = {
  query: '',
  onQueryChange: () => {},
  sort: 'rate-desc',
  onSortChange: () => {},
  isPro: false,
}

describe('DashboardMenuList', () => {
  it('groups 要確認 first, then the rest, and surfaces the danger banner', () => {
    const summaries = [
      summary('a', 'メニューA', 38, 'danger'),
      summary('b', 'メニューB', 32, 'caution'),
      summary('x', '売価未設定', null, 'attention'),
    ]
    render(<DashboardMenuList {...BASE} summaries={summaries} dangerCount={1} onOpenMenu={() => {}} />)

    expect(screen.getByRole('heading', { name: '要確認' })).toBeInTheDocument()
    expect(screen.getByText('危険な原価率のメニューが1件あります')).toBeInTheDocument()
    expect(screen.getByText('メニューA')).toBeInTheDocument()
  })

  it('opens a menu when its row is tapped', async () => {
    const onOpenMenu = vi.fn()
    render(<DashboardMenuList {...BASE} summaries={[summary('a', '唐揚げ定食', 24.8, 'good')]} dangerCount={0} onOpenMenu={onOpenMenu} />)
    await userEvent.click(screen.getByText('唐揚げ定食'))
    expect(onOpenMenu).toHaveBeenCalledWith('a')
  })

  it('shows the no-menus empty state with seed + new CTAs', async () => {
    const onSeedSample = vi.fn()
    render(<DashboardMenuList {...BASE} summaries={[]} dangerCount={0} onOpenMenu={() => {}} onSeedSample={onSeedSample} onNewMenu={() => {}} />)
    expect(screen.getByText('まだメニューがありません')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'サンプルを入れて試す' }))
    expect(onSeedSample).toHaveBeenCalledOnce()
  })

  it('shows a no-match empty state and clears the query', async () => {
    const onQueryChange = vi.fn()
    render(
      <DashboardMenuList
        {...BASE}
        query="xyz"
        onQueryChange={onQueryChange}
        summaries={[summary('a', '唐揚げ定食', 24.8, 'good')]}
        dangerCount={0}
        onOpenMenu={() => {}}
      />,
    )
    expect(screen.getByText('「xyz」に一致するメニューはありません')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '検索条件をクリア' }))
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('marks the bulk-simulation entry with a PRO lock for Free users', () => {
    render(<DashboardMenuList {...BASE} summaries={[summary('a', 'A', 24.8, 'good')]} dangerCount={0} onOpenMenu={() => {}} onBulkSimulate={() => {}} />)
    const button = screen.getByRole('button', { name: /一括値上げシミュレーション/ })
    expect(button).toHaveTextContent('PRO')
  })
})
