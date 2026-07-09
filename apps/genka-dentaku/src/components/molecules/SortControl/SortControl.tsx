'use client'
/**
 * SortControl — dashboard sort selector (design-spec §4.1 / §8.2). Client.
 * Defaults to 「原価率が悪い順」 (the worst-first order that drives the semaphore dashboard).
 */
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Select, type SelectOption } from '@/components/atoms/Select'
import { Icon } from '@/components/atoms/Icon'

export const DEFAULT_SORT_OPTIONS: SelectOption[] = [
  { value: 'rate-desc', label: '原価率が悪い順' },
  { value: 'name-asc', label: '名前順' },
  { value: 'margin-asc', label: '粗利が低い順' },
]

export interface SortControlProps {
  value: string
  onChange: (value: string) => void
  options?: SelectOption[]
  ariaLabel?: string
  className?: string
}

export function SortControl({ value, onChange, options = DEFAULT_SORT_OPTIONS, ariaLabel = '並び替え', className }: SortControlProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon icon={ArrowUpDown} size="sm" className="text-ink-muted" />
      <Select aria-label={ariaLabel} options={options} value={value} onChange={onChange} />
    </div>
  )
}
