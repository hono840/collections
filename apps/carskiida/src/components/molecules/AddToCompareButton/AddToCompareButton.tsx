'use client'

import { cn } from '@/lib/utils/cn'
import { MAX_COMPARE } from '@/features/compare/data'
import { compareStore, useCompareList } from '@/features/compare/store'

export interface AddToCompareButtonProps {
  /** "manufacturer:model" 形式 */
  compareRef: string
  className?: string
}

/**
 * 比較トレイへの追加/削除ボタン（molecule / client）。
 * 最大 MAX_COMPARE 台。リンク内に置く場合は親側でイベント伝播に注意。
 */
export function AddToCompareButton({
  compareRef,
  className,
}: AddToCompareButtonProps) {
  const list = useCompareList()
  const selected = list.includes(compareRef)
  const full = list.length >= MAX_COMPARE && !selected

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    compareStore.toggle(compareRef)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={full}
      aria-pressed={selected}
      title={full ? `比較は最大 ${MAX_COMPARE} 台までです` : undefined}
      className={cn(
        'ck-num rounded-sm border px-2 py-1 text-xs uppercase tracking-wide transition-colors',
        selected
          ? 'border-ck-accent bg-ck-accent/10 text-ck-accent'
          : 'border-ck-border text-ck-text-muted hover:border-ck-accent hover:text-ck-accent',
        full && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {selected ? '✓ 比較中' : full ? '満杯' : '+ 比較'}
    </button>
  )
}
