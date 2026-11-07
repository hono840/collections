import { DriveCard } from '@/components/molecules/DriveCard'
import { EmptyState } from '@/components/molecules/EmptyState'
import type { Drive } from '@/types/drive'
import { cn } from '@/lib/utils/cn'

export type DriveListProps = {
  roadId: string
  drives: ReadonlyArray<Drive>
  className?: string
}

/** E-03 */
const EMPTY_MESSAGE = 'まだ走行記録がありません。ドライブのあと、落ち着いた場所で印象を書き残しましょう。'

/** Newest first: drive date desc, then creation desc. Sorted here so the order never depends on the caller. */
function newestFirst(drives: ReadonlyArray<Drive>): Drive[] {
  return [...drives].sort((left, right) => {
    if (left.drivenOn !== right.drivenOn) return left.drivenOn < right.drivenOn ? 1 : -1
    return Date.parse(right.createdAt) - Date.parse(left.createdAt)
  })
}

/** The drive records of one road (architecture 2.1 / US-07). 0 drives -> E-03 with "走行記録を追加". */
export function DriveList({ roadId, drives, className }: DriveListProps) {
  if (drives.length === 0) {
    return (
      <EmptyState
        message={EMPTY_MESSAGE}
        actionLabel="走行記録を追加"
        actionHref={`/roads/${roadId}/drives/new`}
        className={className}
      />
    )
  }

  return (
    <ul aria-label="走行記録" className={cn('space-y-3', className)}>
      {newestFirst(drives).map((drive) => (
        <li key={drive.id}>
          <DriveCard drive={drive} roadId={roadId} />
        </li>
      ))}
    </ul>
  )
}
