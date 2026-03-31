'use client'

import { useRef, useTransition } from 'react'
import type { Category } from '@/types/app'
import { Dialog } from '@/components/atoms/Dialog'
import { useToast } from '@/components/atoms/Toast'
import { createTransaction } from '@/app/(app)/transactions/actions'
import { Loader2 } from 'lucide-react'

export interface QuickExpenseDialogProps {
  open: boolean
  onClose: () => void
  categories: Category[]
}

export function QuickExpenseDialog({
  open,
  onClose,
  categories,
}: QuickExpenseDialogProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTransaction(formData)
      if (result.success) {
        toast('支出を記録しました')
        formRef.current?.reset()
        onClose()
      } else {
        toast(result.error, 'error')
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="支出を記録">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="type" value="expense" />

        {/* Amount - auto focus for quick entry */}
        <div>
          <label
            htmlFor="quick-amount"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            金額
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400 dark:text-zinc-500">
              ¥
            </span>
            <input
              id="quick-amount"
              name="amount"
              type="text"
              inputMode="numeric"
              autoFocus
              required
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-8 pr-3 text-2xl font-semibold tabular-nums text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="quick-categoryId"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            カテゴリ
          </label>
          <select
            id="quick-categoryId"
            name="categoryId"
            required
            defaultValue=""
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
            htmlFor="quick-date"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            日付
          </label>
          <input
            id="quick-date"
            name="date"
            type="date"
            defaultValue={today}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Note */}
        <div>
          <label
            htmlFor="quick-note"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            メモ
          </label>
          <input
            id="quick-note"
            name="note"
            type="text"
            maxLength={200}
            placeholder="メモを入力（任意）"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          記録する
        </button>
      </form>
    </Dialog>
  )
}
