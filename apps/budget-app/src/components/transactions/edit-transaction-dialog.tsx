'use client'

import { useTransition } from 'react'
import type { TransactionWithCategory, Category } from '@/types/app'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  updateTransaction,
  deleteTransaction,
} from '@/app/(app)/transactions/actions'
import { Trash2, Loader2 } from 'lucide-react'

interface EditTransactionDialogProps {
  transaction: TransactionWithCategory | null
  categories: Category[]
  onClose: () => void
}

export function EditTransactionDialog({
  transaction,
  categories,
  onClose,
}: EditTransactionDialogProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  if (!transaction) return null

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateTransaction(formData)
      if (result.success) {
        toast('更新しました')
        onClose()
      } else {
        toast(result.error, 'error')
      }
    })
  }

  function handleDelete() {
    if (!transaction) return
    startDeleteTransition(async () => {
      const fd = new FormData()
      fd.set('id', transaction.id)
      const result = await deleteTransaction(fd)
      if (result.success) {
        toast('削除しました')
        onClose()
      } else {
        toast(result.error, 'error')
      }
    })
  }

  return (
    <Dialog open={!!transaction} onClose={onClose} title="取引を編集">
      <form action={handleUpdate} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={transaction.id} />
        <input type="hidden" name="type" value={transaction.type} />

        {/* Amount */}
        <div>
          <label
            htmlFor="edit-amount"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            金額
          </label>
          <input
            id="edit-amount"
            name="amount"
            type="text"
            inputMode="numeric"
            defaultValue={transaction.amount}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base tabular-nums text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="edit-categoryId"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            カテゴリ
          </label>
          <select
            id="edit-categoryId"
            name="categoryId"
            defaultValue={transaction.category_id ?? ''}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          >
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="edit-date"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            日付
          </label>
          <input
            id="edit-date"
            name="date"
            type="date"
            defaultValue={transaction.date}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Note */}
        <div>
          <label
            htmlFor="edit-note"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            メモ
          </label>
          <input
            id="edit-note"
            name="note"
            type="text"
            defaultValue={transaction.note}
            maxLength={200}
            placeholder="メモを入力（任意）"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            削除
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            保存
          </button>
        </div>
      </form>
    </Dialog>
  )
}
