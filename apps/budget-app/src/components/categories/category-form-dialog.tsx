'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Category } from '@/types/app'
import { Dialog } from '@/components/ui/dialog'
import { IconPicker } from '@/components/categories/icon-picker'
import { useToast } from '@/components/ui/toast'
import {
  createCategory,
  updateCategory,
} from '@/app/(app)/categories/actions'
import { Loader2 } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#64748b',
]

interface CategoryFormDialogProps {
  open: boolean
  onClose: () => void
  category: Category | null
}

export function CategoryFormDialog({
  open,
  onClose,
  category,
}: CategoryFormDialogProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const isEditing = category !== null

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('circle')
  const [color, setColor] = useState('#3b82f6')

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open && category) {
      setName(category.name)
      setIcon(category.icon)
      setColor(category.color)
    } else if (open && !category) {
      setName('')
      setIcon('circle')
      setColor('#3b82f6')
    }
  }, [open, category])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('icon', icon)
      formData.set('color', color)

      if (isEditing && category) {
        formData.set('id', category.id)
        const result = await updateCategory(formData)
        if (result.success) {
          toast('カテゴリを更新しました')
          onClose()
        } else {
          toast(result.error, 'error')
        }
      } else {
        const result = await createCategory(formData)
        if (result.success) {
          toast('カテゴリを作成しました')
          onClose()
        } else {
          toast(result.error, 'error')
        }
      }
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'カテゴリを編集' : 'カテゴリを作成'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label
            htmlFor="cat-name"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            カテゴリ名
          </label>
          <input
            id="cat-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
            placeholder="例: 食費"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Color picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
            カラー
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  color === c
                    ? 'scale-110 border-slate-900 dark:border-white'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
            アイコン
          </label>
          <IconPicker
            selectedIcon={icon}
            color={color}
            onSelect={setIcon}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? '更新する' : '作成する'}
        </button>
      </form>
    </Dialog>
  )
}
