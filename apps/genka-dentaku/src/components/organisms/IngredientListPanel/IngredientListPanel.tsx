'use client'
/**
 * IngredientListPanel — the food-cost master and THE WEDGE entry point (design-spec §4.2 / PRD 4.c).
 * Each row shows the live 有効単価 and an inline 購入価格 quick-edit: committing a new price calls
 * onQuickEditPrice, which flows through updateIngredient → the pure selectors recompute every menu
 * that uses it, and the parent flashes the RecalcIndicator. No save button, no reload.
 *
 * Also: search + sort (name / 有効単価), add + per-row edit, the SampleDataBanner while samples exist,
 * and empty states that point at the next step.
 */
import { Plus, Pencil, Carrot, Search } from 'lucide-react'
import { effectiveUnitPrice, roundUnitPrice2, type Ingredient } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { IconButton } from '@/components/atoms/IconButton'
import { Badge } from '@/components/atoms/Badge'
import { NumberInput } from '@/components/atoms/NumberInput'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SortControl } from '@/components/molecules/SortControl'
import { EmptyState } from '@/components/molecules/EmptyState'
import { SampleDataBanner } from '@/components/molecules/SampleDataBanner'

const SORT_OPTIONS = [
  { value: 'name-asc', label: '名前順' },
  { value: 'unit-price-desc', label: '有効単価が高い順' },
  { value: 'unit-price-asc', label: '有効単価が低い順' },
]

export interface IngredientListPanelProps {
  ingredients: Ingredient[]
  query: string
  onQueryChange: (query: string) => void
  sort: string
  onSortChange: (sort: string) => void
  /** THE WEDGE: commit a new purchase price (input value). Only fires for valid numbers. */
  onQuickEditPrice: (id: string, inputPrice: number) => void
  onEdit: (id: string) => void
  onAdd: () => void
  onSeedSample?: () => void
  hasSamples?: boolean
  onClearSamples?: () => void
  className?: string
}

function unitPriceText(ing: Ingredient): string {
  const eup = effectiveUnitPrice(ing)
  return eup === null ? '—' : `¥${roundUnitPrice2(eup)}/${ing.unit}`
}

function sortIngredients(list: Ingredient[], sort: string): Ingredient[] {
  const copy = [...list]
  if (sort === 'unit-price-desc') return copy.sort((a, b) => (effectiveUnitPrice(b) ?? 0) - (effectiveUnitPrice(a) ?? 0))
  if (sort === 'unit-price-asc') return copy.sort((a, b) => (effectiveUnitPrice(a) ?? 0) - (effectiveUnitPrice(b) ?? 0))
  return copy.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export function IngredientListPanel({
  ingredients,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onQuickEditPrice,
  onEdit,
  onAdd,
  onSeedSample,
  hasSamples = false,
  onClearSamples,
  className,
}: IngredientListPanelProps) {
  const q = query.trim().toLowerCase()
  const filtered = sortIngredients(
    ingredients.filter((i) => q === '' || i.name.toLowerCase().includes(q)),
    sort,
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2">
        <SearchBar value={query} onChange={onQueryChange} placeholder="食材を検索" ariaLabel="食材を検索" className="flex-1" />
        <SortControl value={sort} onChange={onSortChange} options={SORT_OPTIONS} />
      </div>

      <Button iconStart={Plus} variant="secondary" fullWidth onClick={onAdd}>
        食材を追加
      </Button>

      {hasSamples && onClearSamples && <SampleDataBanner onClear={onClearSamples} />}

      {ingredients.length === 0 ? (
        <EmptyState
          icon={Carrot}
          title="食材がありません"
          description="食材を登録すると、メニューの原価を自動計算できます。"
        >
          <Button onClick={onAdd}>食材を追加</Button>
          {onSeedSample && (
            <Button variant="secondary" onClick={onSeedSample}>
              サンプル食材を入れる
            </Button>
          )}
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={`「${query}」に一致する食材はありません`}>
          <Button variant="secondary" onClick={() => onQueryChange('')}>
            検索条件をクリア
          </Button>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((ing) => (
            <li key={ing.id} className="rounded-md bg-surface p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-h3 truncate text-ink">{ing.name}</span>
                    {ing.isSample && <Badge tone="neutral">サンプル</Badge>}
                  </div>
                  <div className="text-body-sm text-ink-secondary">
                    有効単価 <span className="font-num tabular-nums text-ink">{unitPriceText(ing)}</span>
                  </div>
                </div>
                <IconButton icon={Pencil} label={`${ing.name}を編集`} onClick={() => onEdit(ing.id)} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-label shrink-0 text-ink-secondary">購入価格</span>
                <NumberInput
                  aria-label={`${ing.name}の購入価格`}
                  value={ing.inputPrice}
                  prefix="¥"
                  inputMode="decimal"
                  onChange={(v) => {
                    if (v !== null) onQuickEditPrice(ing.id, v)
                  }}
                  className="max-w-[11rem]"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
