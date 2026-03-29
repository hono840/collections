'use client'

import { ICON_MAP, CategoryIcon } from '@/components/categories/category-icon'
import { cn } from '@/lib/utils/cn'

/** Curated icon names for the picker UI */
const PICKER_ICONS = Object.keys(ICON_MAP)

interface IconPickerProps {
  selectedIcon: string
  color: string
  onSelect: (icon: string) => void
}

export function IconPicker({ selectedIcon, color, onSelect }: IconPickerProps) {
  return (
    <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-zinc-700 sm:grid-cols-10">
      {PICKER_ICONS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            selectedIcon === name
              ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-500/10'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-700'
          )}
          title={name}
        >
          <CategoryIcon
            name={name}
            color={selectedIcon === name ? color : undefined}
            size={18}
          />
        </button>
      ))}
    </div>
  )
}
