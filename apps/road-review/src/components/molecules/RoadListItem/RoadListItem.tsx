import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { RoadTypeBadge, RoadTypeSymbol } from '@/components/atoms/RoadTypeBadge'
import { getPrefectureName } from '@/lib/constants/prefectures'
import type { RoadSummary, RoadType } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type RoadListItemProps = {
  road: RoadSummary
  className?: string
}

const symbolBoxClasses: Record<RoadType, string> = {
  pass: 'bg-type-pass-subtle',
  skyline: 'bg-type-skyline-subtle',
  coastal: 'bg-type-coastal-subtle',
  forest: 'bg-type-forest-subtle',
  other: 'bg-type-other-subtle',
}

/**
 * Road card (spec 4-4). The whole card is one link to the detail page.
 * Sprint 2 has no drives yet, so the last line is "走行記録なし" (M-25); the last driven date and the
 * rating meter arrive in Sprint 3.
 */
export function RoadListItem({ road, className }: RoadListItemProps) {
  const prefectureName = getPrefectureName(road.prefectureCode)
  const hasDrives = road.driveCount > 0

  return (
    <Link
      href={`/roads/${road.id}`}
      className={cn(
        'block rounded-md border border-line bg-surface-raised p-4 shadow-1',
        'transition-colors duration-140 ease-standard hover:border-line-strong active:bg-surface-sunken',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-sm', symbolBoxClasses[road.roadType])}
        >
          <RoadTypeSymbol roadType={road.roadType} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="heading-mincho line-clamp-2 block text-lg text-ink">{road.name}</span>
          {prefectureName ? <span className="mt-0.5 block text-sm text-ink-muted">{prefectureName}</span> : null}
        </span>
        <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-ink-subtle" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RoadTypeBadge roadType={road.roadType} />
        {road.lastDrivenOn ? (
          <span className="num text-xs text-ink-muted">最終 {road.lastDrivenOn}</span>
        ) : null}
      </div>
      <div className="mt-2 text-sm">
        {hasDrives ? (
          <span className="text-xs text-ink-muted">記録 {road.driveCount}件</span>
        ) : (
          <span className="text-ink-subtle">走行記録なし</span>
        )}
      </div>
    </Link>
  )
}
