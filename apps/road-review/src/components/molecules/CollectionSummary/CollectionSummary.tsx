import { RoadTypeSymbol } from '@/components/atoms/RoadTypeBadge'
import { TOTAL_PREFECTURES, type CollectionStats } from '@/lib/collection/stats'
import { ROAD_TYPE_OPTIONS } from '@/lib/constants/labels'
import { cn } from '@/lib/utils/cn'

export type CollectionSummaryProps = {
  stats: CollectionStats
  className?: string
}

/** E-06 */
const EMPTY_MESSAGE = 'まだ走った道はありません。走行記録を追加するとここに数えられます'

/**
 * "走った道のコレクション" (PRD US-11 items 1-3; spec 4-10), shown on /roads.
 * Only the user's own counts: no links, no ranking or comparison. 0-count types stay visible.
 */
export function CollectionSummary({ stats, className }: CollectionSummaryProps) {
  const progressPercent = Math.min(100, (stats.drivenPrefectureCount / TOTAL_PREFECTURES) * 100)

  return (
    <section
      aria-labelledby="collection-heading"
      className={cn('rounded-md border border-line bg-surface-raised p-4 md:p-5', className)}
    >
      <h2 id="collection-heading" className="heading-mincho text-xl text-ink">
        走った道のコレクション
      </h2>

      {stats.drivenRoadCount === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{EMPTY_MESSAGE}</p>
      ) : (
        <>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-sm text-ink-muted">走った道</span>
            <span className="heading-mincho text-4xl text-ink">{stats.drivenRoadCount}</span>
            <span className="text-lg text-ink-muted">本</span>
          </p>

          <ul aria-label="種別ごとの本数" className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            {ROAD_TYPE_OPTIONS.map((option) => {
              const count = stats.byRoadType[option.value]
              return (
                <li
                  key={option.value}
                  className="flex items-center gap-2 rounded-md border border-line bg-surface-raised px-3 py-2"
                >
                  <RoadTypeSymbol roadType={option.value} className="size-5 shrink-0" />
                  <span className="text-sm font-bold text-ink">{option.label}</span>
                  <span className="ml-auto flex items-baseline gap-0.5">
                    <span className={cn('num text-lg font-bold', count === 0 ? 'text-ink-subtle' : 'text-ink')}>
                      {count}
                    </span>
                    <span className="text-xs text-ink-muted">本</span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-4">
            <p className="flex items-baseline gap-2">
              <span className="text-sm text-ink-muted">走った都道府県</span>
              <span className="num text-xl font-bold text-ink">
                {stats.drivenPrefectureCount}
                <span className="text-ink-muted">/{TOTAL_PREFECTURES}</span>
              </span>
            </p>
            <div
              role="progressbar"
              aria-label={`走った都道府県 ${TOTAL_PREFECTURES}のうち${stats.drivenPrefectureCount}`}
              aria-valuenow={stats.drivenPrefectureCount}
              aria-valuemin={0}
              aria-valuemax={TOTAL_PREFECTURES}
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken"
            >
              {/* Inline style: the fill width is data-driven (0-100%), no static utility can express it. */}
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
