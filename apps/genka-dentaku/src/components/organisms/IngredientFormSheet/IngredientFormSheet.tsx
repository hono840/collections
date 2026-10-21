'use client'
/**
 * IngredientFormSheet — the add/edit ingredient bottom sheet (design-spec §4.2 / §8.3). Wraps the
 * IngredientForm molecule in the shared Sheet (composition via slot). Editing adds a delete flow: if
 * the food is used by menus, the confirm states how many (PRD 8.6 — those rows become 「不明」), so the
 * user is never surprised. The form's submit payload maps 1:1 to the state layer's IngredientInput.
 */
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  IngredientForm,
  type IngredientFormSubmit,
  type IngredientFormValues,
} from '@/components/molecules/IngredientForm'
import { Button } from '@/components/atoms/Button'
import { Sheet } from '@/components/organisms/Sheet'

export interface IngredientFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ingredient id being edited, or null when adding. */
  editingId: string | null
  initial?: Partial<IngredientFormValues>
  /** Number of menus that reference this ingredient (delete confirmation). */
  usedByMenuCount?: number
  onSubmit: (values: IngredientFormSubmit) => void
  onDelete?: (id: string) => void
  className?: string
}

export function IngredientFormSheet({
  open,
  onClose,
  editingId,
  initial,
  usedByMenuCount = 0,
  onSubmit,
  onDelete,
  className,
}: IngredientFormSheetProps) {
  const editing = editingId !== null
  const [confirming, setConfirming] = useState(false)

  // Reset the confirm affordance whenever the sheet opens/closes or switches target (render-phase).
  const sheetKey = `${open}:${editingId}`
  const [prevKey, setPrevKey] = useState(sheetKey)
  if (sheetKey !== prevKey) {
    setPrevKey(sheetKey)
    setConfirming(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? '食材を編集' : '食材を追加'} className={className}>
      <IngredientForm
        key={editingId ?? 'new'}
        initial={initial}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel={editing ? '更新' : '追加'}
      />

      {editing && onDelete && (
        <div className="mt-4 border-t border-border pt-4">
          {!confirming ? (
            <Button variant="danger" iconStart={Trash2} fullWidth onClick={() => setConfirming(true)}>
              この食材を削除
            </Button>
          ) : (
            <div role="alertdialog" aria-label="食材の削除" className="rounded-md border border-danger-fg bg-danger-bg p-3">
              <p className="text-body-sm text-danger-fg">
                {usedByMenuCount > 0
                  ? `この食材は${usedByMenuCount}件のメニューで使用中です。削除するとそのメニューの原価は「不明」になります。`
                  : 'この食材を削除しますか？'}
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="danger" onClick={() => onDelete(editingId)}>
                  削除する
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
