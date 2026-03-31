'use client'

import { useTransition } from 'react'
import type { Category } from '@/types/app'
import { CategoryIcon } from '@/components/molecules/CategoryIcon'
import { archiveCategory } from '@/app/(app)/categories/actions'
import { useToast } from '@/components/atoms/Toast'
import { Pencil, Archive, Loader2 } from 'lucide-react'

export interface CategoryCardProps {
  category: Category
  onEdit: (category: Category) => void
}

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    if (!confirm(`「${category.name}」をアーカイブしますか？`)) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', category.id)
      const result = await archiveCategory(formData)
      if (result.success) {
        toast('カテゴリをアーカイブしました')
      } else {
        toast(result.error, 'error')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors dark:border-zinc-700">
      {/* Color dot + Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}15` }}
      >
        <CategoryIcon
          name={category.icon}
          color={category.color}
          size={20}
        />
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800 dark:text-zinc-200">
          {category.name}
        </span>
        {category.is_default && (
          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
            デフォルト
          </span>
        )}
      </div>

      {/* Color preview */}
      <div
        className="h-4 w-4 shrink-0 rounded-full border border-slate-200 dark:border-zinc-600"
        style={{ backgroundColor: category.color }}
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onEdit(category)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          aria-label="編集"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={handleArchive}
          disabled={isPending}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label="アーカイブ"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
