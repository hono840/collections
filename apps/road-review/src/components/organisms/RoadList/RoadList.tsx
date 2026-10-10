import { EmptyState } from '@/components/molecules/EmptyState'
import { RoadListItem } from '@/components/molecules/RoadListItem'
import type { RoadSummary } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type RoadListProps = {
  roads: RoadSummary[]
  className?: string
}

/** E-01 */
const EMPTY_MESSAGE = 'まだ道が登録されていません。最初の道を登録しましょう'

/** The road list (US-06). Same roads as the map, in the given order. 0 roads -> E-01. */
export function RoadList({ roads, className }: RoadListProps) {
  if (roads.length === 0) {
    return (
      <EmptyState message={EMPTY_MESSAGE} actionLabel="道を登録" actionHref="/roads/new" className={className} />
    )
  }

  return (
    <ul aria-label="道のリスト" className={cn('space-y-3', className)}>
      {roads.map((road) => (
        <li key={road.id}>
          <RoadListItem road={road} />
        </li>
      ))}
    </ul>
  )
}
