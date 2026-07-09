'use client'
/**
 * RecipeLineRow — one recipe material line (design-spec §4.3 / §8.2). Client.
 * IngredientPicker + quantity NumberInput + unit Select (filtered to units COMPATIBLE with the
 * chosen ingredient via domain `unitsCompatible`) + auto line cost + remove. Unresolvable lines
 * (missing ingredient / unit mismatch / uncomputable price) show an inline danger message and
 * render 「—」 for the cost, mirroring the domain `lineCost` contract (PRD 8.6).
 */
import { Trash2 } from 'lucide-react'
import {
  lineCost,
  unitsCompatible,
  roundYen,
  WEIGHT_UNITS,
  VOLUME_UNITS,
  type Ingredient,
  type RecipeItem,
  type LineIssue,
} from '@/lib/domain'
import { formatYen } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { IngredientPicker } from '@/components/molecules/IngredientPicker'
import { NumberInput } from '@/components/atoms/NumberInput'
import { Select } from '@/components/atoms/Select'
import { IconButton } from '@/components/atoms/IconButton'
import { HelperText } from '@/components/atoms/HelperText'

export interface RecipeLineRowProps {
  line: RecipeItem
  ingredients: Ingredient[]
  onChange: (line: RecipeItem) => void
  onRemove: () => void
  className?: string
}

const ISSUE_MESSAGE: Record<LineIssue, string> = {
  'missing-ingredient': '食材が見つかりません',
  'unit-mismatch': '単位が一致しません',
  'invalid-ingredient': '有効単価を計算できません',
}

export function RecipeLineRow({ line, ingredients, onChange, onRemove, className }: RecipeLineRowProps) {
  const ingredient = ingredients.find((i) => i.id === line.ingredientId)

  // Units offered are filtered to those compatible with the ingredient's dimension.
  const candidates = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...(ingredient ? [ingredient.unit] : [])]
  const compatible = ingredient
    ? candidates.filter((u) => unitsCompatible(ingredient.unit, ingredient.dimension, u))
    : []
  const unitSet = new Set<string>(compatible)
  unitSet.add(line.unit) // keep the current (possibly mismatched) unit selectable
  const unitOptions = [...unitSet].map((u) => ({ value: u, label: u === '' ? '—' : u }))

  const cost = lineCost(line, ingredient)
  const costText = cost.ok ? formatYen(roundYen(cost.cost)) : '—'

  function pickIngredient(id: string) {
    const next = ingredients.find((i) => i.id === id)
    // Reset the unit to the ingredient's own unit (always compatible) on ingredient change.
    onChange({ ingredientId: id, quantity: line.quantity, unit: next ? next.unit : line.unit })
  }

  return (
    <div className={cn('flex flex-col gap-2 rounded-md bg-surface p-3 shadow-sm', className)}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <IngredientPicker
            ingredients={ingredients}
            value={line.ingredientId || null}
            onChange={pickIngredient}
          />
        </div>
        <IconButton icon={Trash2} label="この材料を削除" variant="danger" onClick={onRemove} />
      </div>

      <div className="flex items-center gap-2">
        <NumberInput
          aria-label="使用量"
          value={line.quantity}
          onChange={(v) => onChange({ ...line, quantity: v ?? 0 })}
          className="w-28"
        />
        <Select
          aria-label="単位"
          options={unitOptions}
          value={line.unit}
          onChange={(u) => onChange({ ...line, unit: u })}
          className="w-24"
        />
        <div className="ml-auto text-right">
          <div className="text-caption text-ink-muted">原価</div>
          <div className="font-num text-metric tabular-nums text-ink">{costText}</div>
        </div>
      </div>

      {!cost.ok && <HelperText tone="danger">{ISSUE_MESSAGE[cost.reason]}</HelperText>}
    </div>
  )
}
