'use client'
/**
 * RecipeEditor — the menu editor and the strongest expression of THE WEDGE (design-spec §4.3).
 * メニュー名 / 売価 + TaxToggle up top, a RecipeLineRow per material, an IngredientPicker to add a
 * line, and the sticky LiveCostSummary (spec-dictated composition) that recomputes 原価/原価率/粗利
 * live on every edit. Delete has an inline confirm. All mutations flow to the state layer via the
 * callbacks (add/update/removeLine, updateMenu), so cost is never persisted — always recomputed.
 */
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { roundYen, type Ingredient, type Menu, type MenuSummary, type RecipeItem } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { TextInput } from '@/components/atoms/TextInput'
import { NumberInput } from '@/components/atoms/NumberInput'
import { Button } from '@/components/atoms/Button'
import { FormField } from '@/components/molecules/FormField'
import { TaxToggle } from '@/components/molecules/TaxToggle'
import { RecipeLineRow } from '@/components/molecules/RecipeLineRow'
import { IngredientPicker } from '@/components/molecules/IngredientPicker'
import { LiveCostSummary } from '@/components/organisms/LiveCostSummary'

export interface RecipeEditorSellPatch {
  sellInputPrice?: number
  sellPriceIncludesTax?: boolean
  sellTaxRate?: number
}

export interface RecipeEditorProps {
  menu: Menu
  summary: MenuSummary
  ingredients: Ingredient[]
  warn: number
  danger: number
  onChangeName: (name: string) => void
  onChangeSell: (patch: RecipeEditorSellPatch) => void
  onAddLine: (ingredientId: string) => void
  onChangeLine: (index: number, line: RecipeItem) => void
  onRemoveLine: (index: number) => void
  onSimulate: () => void
  onDelete: () => void
  onGoToIngredients?: () => void
  className?: string
}

export function RecipeEditor({
  menu,
  summary,
  ingredients,
  warn,
  danger,
  onChangeName,
  onChangeSell,
  onAddLine,
  onChangeLine,
  onRemoveLine,
  onSimulate,
  onDelete,
  onGoToIngredients,
  className,
}: RecipeEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Reset the delete confirm when switching menus (render-phase).
  const [prevMenuId, setPrevMenuId] = useState(menu.id)
  if (menu.id !== prevMenuId) {
    setPrevMenuId(menu.id)
    setConfirmDelete(false)
  }

  const marginYen = summary.marginExTax === null ? null : roundYen(summary.marginExTax)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-3 rounded-md bg-surface p-3 shadow-sm">
        <FormField label="メニュー名" required>
          {({ id }) => (
            <TextInput id={id} value={menu.name} onChange={(e) => onChangeName(e.target.value)} placeholder="例: 唐揚げ定食" maxLength={60} />
          )}
        </FormField>
        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-secondary">売価</span>
          <NumberInput
            aria-label="売価"
            value={menu.sellInputPrice}
            prefix="¥"
            inputMode="decimal"
            onChange={(v) => onChangeSell({ sellInputPrice: v ?? 0 })}
          />
          <TaxToggle
            includesTax={menu.sellPriceIncludesTax}
            taxRate={menu.sellTaxRate}
            onChange={({ includesTax, taxRate }) => onChangeSell({ sellPriceIncludesTax: includesTax, sellTaxRate: taxRate })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-h3 text-ink">材料</h2>
        {menu.items.length === 0 && <p className="text-body-sm text-ink-muted">材料を追加すると原価が計算されます。</p>}
        {menu.items.map((item, index) => (
          <RecipeLineRow
            key={index}
            line={item}
            ingredients={ingredients}
            onChange={(line) => onChangeLine(index, line)}
            onRemove={() => onRemoveLine(index)}
          />
        ))}

        {ingredients.length === 0 ? (
          <div className="text-body-sm rounded-md bg-surface-sunken p-3 text-ink-secondary">
            先に食材を登録してください。
            {onGoToIngredients && (
              <button type="button" onClick={onGoToIngredients} className="ml-1 text-primary-ink underline">
                食材を登録
              </button>
            )}
          </div>
        ) : (
          <IngredientPicker
            ingredients={ingredients}
            value={null}
            onChange={(id) => onAddLine(id)}
            placeholder="＋ 材料を追加"
            ariaLabel="材料を追加"
          />
        )}
      </div>

      <div>
        {!confirmDelete ? (
          <Button variant="danger" iconStart={Trash2} onClick={() => setConfirmDelete(true)}>
            メニューを削除
          </Button>
        ) : (
          <div role="alertdialog" aria-label="メニューの削除" className="rounded-md border border-danger-fg bg-danger-bg p-3">
            <p className="text-body-sm text-danger-fg">このメニューを削除しますか？</p>
            <div className="mt-2 flex gap-2">
              <Button variant="danger" onClick={onDelete}>
                削除する
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 bg-bg/95 px-4 pt-2 pb-2 backdrop-blur">
        <LiveCostSummary
          costYen={summary.costYen}
          ratePercent1={summary.ratePercent1}
          marginYen={marginYen}
          status={summary.status}
          warn={warn}
          danger={danger}
          onSimulate={onSimulate}
        />
      </div>
    </div>
  )
}
