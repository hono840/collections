import { ROAD_TYPE_LABELS } from '@/lib/constants/labels'
import type { RoadType } from '@/types/road'
import { cn } from '@/lib/utils/cn'
import { RoadTypeSymbol } from './RoadTypeSymbol'

export type RoadTypeBadgeProps = {
  roadType: RoadType
  className?: string
}

const badgeBackgroundClasses: Record<RoadType, string> = {
  pass: 'bg-type-pass-subtle',
  skyline: 'bg-type-skyline-subtle',
  coastal: 'bg-type-coastal-subtle',
  forest: 'bg-type-forest-subtle',
  other: 'bg-type-other-subtle',
}

/** Road type badge (spec 4-5): symbol in the type color + the type name in ink (never color only). */
export function RoadTypeBadge({ roadType, className }: RoadTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full pr-2.5 pl-2 text-xs font-bold text-ink',
        badgeBackgroundClasses[roadType],
        className,
      )}
    >
      <RoadTypeSymbol roadType={roadType} />
      <span>{ROAD_TYPE_LABELS[roadType]}</span>
    </span>
  )
}
