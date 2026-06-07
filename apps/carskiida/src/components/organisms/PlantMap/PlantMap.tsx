import { cn } from '@/lib/utils/cn'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import type { ProductionAssignment } from '@/types/car'

export interface PlantMapProps {
  production: ProductionAssignment[]
  className?: string
}

/**
 * 生産地ビュー（organism）— carskiida 最大の差別化点「どこで作られたか」を一級表示する。
 * MVP は工場リスト表示（P2 でインタラクティブ地図に拡張）。
 */
export function PlantMap({ production, className }: PlantMapProps) {
  if (production.length === 0) {
    return (
      <p className={cn('text-sm text-ck-text-muted', className)}>
        生産地データは収録準備中です。
      </p>
    )
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {production.map((p, i) => {
        const years =
          p.yearFrom != null
            ? `${p.yearFrom}–${p.yearTo ?? '現在'}`
            : null
        return (
          <li
            key={`${p.plant.id}-${i}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-ck-border bg-ck-surface px-4 py-3"
          >
            <span aria-hidden className="text-ck-accent">
              ▣
            </span>
            <span className="text-base text-ck-text">{p.plant.name}</span>
            <span className="text-sm text-ck-text-muted">
              {[p.plant.region, p.plant.country].filter(Boolean).join(' / ')}
            </span>
            {years && (
              <span className="ck-num text-xs text-ck-text-muted">{years}</span>
            )}
            <span className="ml-auto">
              <SourceBadge source={p.source} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}
