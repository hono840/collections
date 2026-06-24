'use client'

import { cn } from '@/lib/utils/cn'
import type { Generation } from '@/types/car'

export interface GenerationTimelineProps {
  generations: Generation[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}

/**
 * 世代タイムライン（organism）— 横スクロールの「年表＝計測軸」。
 * 一本の基線にノードを並べ、現在世代をアクセント表示する。
 */
export function GenerationTimeline({
  generations,
  activeId,
  onSelect,
  className,
}: GenerationTimelineProps) {
  return (
    <nav
      aria-label="世代タイムライン"
      className={cn('relative overflow-x-auto', className)}
    >
      <ol className="flex min-w-max items-stretch gap-2 border-t-2 border-ck-border-strong pt-3">
        {generations.map((gen) => {
          const isActive = gen.id === activeId
          const years = `${gen.yearFrom}–${gen.yearTo ?? '現在'}`
          return (
            <li key={gen.id}>
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelect(gen.id)}
                className={cn(
                  'flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'border-ck-accent bg-ck-accent/10'
                    : 'border-ck-border bg-ck-surface hover:border-ck-accent'
                )}
              >
                <span
                  className={cn(
                    'ck-num text-xs uppercase tracking-wide',
                    isActive ? 'text-ck-accent' : 'text-ck-text-muted'
                  )}
                >
                  {gen.code ?? `${gen.ordinal}代目`}
                </span>
                <span className="mt-0.5 text-sm text-ck-text">
                  {gen.nameJa ?? `${gen.ordinal}代目`}
                </span>
                <span className="ck-num mt-0.5 text-xs text-ck-text-muted">
                  {years}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
