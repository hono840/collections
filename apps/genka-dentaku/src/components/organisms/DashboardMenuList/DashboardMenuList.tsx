'use client'
/**
 * DashboardMenuList — search + sort toolbar, the danger roll-up banner, and the worst-first menu
 * list grouped 要確認 → 原価率順 (design-spec §4.1 / §4.e / §8.3). Each menu is a MenuRow (status band
 * + name/売価/粗利 + CostRatePill). Empty states state the next step: no menus → seed sample / new
 * menu; no search match → clear. The bulk-simulation entry shows a gold lock for Free.
 */
import { OctagonX, TrendingUp, Lock, Utensils, Search } from 'lucide-react'
import { roundYen, type MenuSummary } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SortControl } from '@/components/molecules/SortControl'
import { MenuRow } from '@/components/molecules/MenuRow'
import { EmptyState } from '@/components/molecules/EmptyState'

export interface DashboardMenuListProps {
  summaries: MenuSummary[]
  dangerCount: number
  query: string
  onQueryChange: (query: string) => void
  sort: string
  onSortChange: (sort: string) => void
  onOpenMenu: (id: string) => void
  isPro: boolean
  onBulkSimulate?: () => void
  onSeedSample?: () => void
  onNewMenu?: () => void
  className?: string
}

function sortRest(list: MenuSummary[], sort: string): MenuSummary[] {
  const copy = [...list]
  if (sort === 'name-asc') return copy.sort((a, b) => a.menu.name.localeCompare(b.menu.name, 'ja'))
  if (sort === 'margin-asc') return copy.sort((a, b) => (a.marginExTax ?? 0) - (b.marginExTax ?? 0))
  // default: worst (highest) cost rate first
  return copy.sort((a, b) => (b.ratePercent1 ?? 0) - (a.ratePercent1 ?? 0))
}

function Row({ s, onOpen }: { s: MenuSummary; onOpen: (id: string) => void }) {
  return (
    <MenuRow
      name={s.menu.name}
      sellPrice={s.sellIncTax === null ? null : roundYen(s.sellIncTax)}
      margin={s.marginExTax === null ? null : roundYen(s.marginExTax)}
      rate={s.ratePercent1}
      status={s.status}
      isSample={s.menu.isSample}
      onOpen={() => onOpen(s.menu.id)}
    />
  )
}

export function DashboardMenuList({
  summaries,
  dangerCount,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onOpenMenu,
  isPro,
  onBulkSimulate,
  onSeedSample,
  onNewMenu,
  className,
}: DashboardMenuListProps) {
  const q = query.trim().toLowerCase()
  const matches = (s: MenuSummary) => q === '' || s.menu.name.toLowerCase().includes(q)

  const attention = summaries.filter((s) => s.needsAttention && matches(s)).sort((a, b) => a.menu.name.localeCompare(b.menu.name, 'ja'))
  const rest = sortRest(summaries.filter((s) => !s.needsAttention && matches(s)), sort)
  const nothingVisible = attention.length === 0 && rest.length === 0

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2">
        <SearchBar value={query} onChange={onQueryChange} placeholder="メニューを検索" ariaLabel="メニューを検索" className="flex-1" />
        <SortControl value={sort} onChange={onSortChange} />
      </div>

      {onBulkSimulate && (
        <Button
          variant="secondary"
          iconStart={isPro ? TrendingUp : Lock}
          onClick={onBulkSimulate}
          className={cn('justify-start', !isPro && 'text-pro-ink')}
        >
          一括値上げシミュレーション
          {!isPro && <span className="text-caption ml-auto text-pro-ink">PRO</span>}
        </Button>
      )}

      {dangerCount > 0 && (
        <div role="note" className="flex items-center gap-2 rounded-md bg-danger-bg px-3 py-2 text-danger-fg">
          <Icon icon={OctagonX} size="sm" />
          <span className="text-body-sm">危険な原価率のメニューが{dangerCount}件あります</span>
        </div>
      )}

      {summaries.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="まだメニューがありません"
          description="サンプルを入れて、価格を1つ変えてみましょう。全メニューの原価率が一気に動きます。"
        >
          {onSeedSample && <Button onClick={onSeedSample}>サンプルを入れて試す</Button>}
          {onNewMenu && (
            <Button variant="secondary" onClick={onNewMenu}>
              新規メニューを作る
            </Button>
          )}
        </EmptyState>
      ) : nothingVisible ? (
        <EmptyState icon={Search} title={`「${query}」に一致するメニューはありません`}>
          <Button variant="secondary" onClick={() => onQueryChange('')}>
            検索条件をクリア
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {attention.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-label text-ink-secondary">要確認</h2>
              {attention.map((s) => (
                <Row key={s.menu.id} s={s} onOpen={onOpenMenu} />
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2">
              {attention.length > 0 && <h2 className="text-label text-ink-secondary">原価率順</h2>}
              {rest.map((s) => (
                <Row key={s.menu.id} s={s} onOpen={onOpenMenu} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
