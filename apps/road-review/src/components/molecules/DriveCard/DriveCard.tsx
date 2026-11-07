import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { RatingMeter } from '@/components/atoms/RatingMeter'
import { TRAFFIC_LABELS, VEHICLE_TYPE_LABELS, WEATHER_LABELS } from '@/lib/constants/labels'
import type { Drive } from '@/types/drive'
import { cn } from '@/lib/utils/cn'

export type DriveCardProps = {
  drive: Drive
  roadId: string
  className?: string
}

type Fact = { key: string; label: string; value: string }

/** Short axis names for the card (the full "走りやすさ（道幅・見通し）" lives in the form and the summary). */
function optionalRatings(drive: Drive): Fact[] {
  const facts: Fact[] = []
  if (drive.ratingScenery !== null) facts.push({ key: 'scenery', label: '景観', value: String(drive.ratingScenery) })
  if (drive.ratingRoadSurface !== null) {
    facts.push({ key: 'roadSurface', label: '路面状態', value: String(drive.ratingRoadSurface) })
  }
  if (drive.ratingEaseOfDriving !== null) {
    facts.push({ key: 'easeOfDriving', label: '走りやすさ', value: String(drive.ratingEaseOfDriving) })
  }
  return facts
}

function situations(drive: Drive): Fact[] {
  const facts: Fact[] = []
  if (drive.traffic !== null) facts.push({ key: 'traffic', label: '交通量', value: TRAFFIC_LABELS[drive.traffic] })
  if (drive.weather !== null) facts.push({ key: 'weather', label: '天候', value: WEATHER_LABELS[drive.weather] })
  return facts
}

/**
 * One drive record (architecture 2.1; UX S-06 "日付・総合・メモ"). Server molecule.
 * Optional values are left out instead of printing placeholders; no time or speed, ever.
 */
export function DriveCard({ drive, roadId, className }: DriveCardProps) {
  const headingId = `drive-${drive.id}-heading`
  const ratings = optionalRatings(drive)
  const facts = situations(drive)

  return (
    <article
      aria-labelledby={headingId}
      className={cn('rounded-md border border-line bg-surface-raised p-4 shadow-1', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={headingId} className="num pt-2 text-base font-bold text-ink">
          <time dateTime={drive.drivenOn}>{drive.drivenOn}</time>
        </h3>
        <Link
          href={`/roads/${roadId}/drives/${drive.id}/edit`}
          aria-label={`${drive.drivenOn}の記録を編集`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm px-3 text-sm font-bold text-primary hover:bg-primary-subtle"
        >
          <Pencil aria-hidden="true" className="size-4" />
          編集
        </Link>
      </div>

      <p className="mt-1 flex items-center gap-3">
        <span className="text-sm text-ink-muted">
          総合 <span className="num text-base font-bold text-ink">{drive.ratingOverall}</span>
        </span>
        <RatingMeter value={drive.ratingOverall} label={`総合評価 ${drive.ratingOverall}`} />
      </p>

      {ratings.length > 0 || facts.length > 0 || drive.vehicleType !== null ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          {[...ratings, ...facts].map((fact) => (
            <span key={fact.key}>
              {fact.label} <span className="num font-bold text-ink">{fact.value}</span>
            </span>
          ))}
          {drive.vehicleType !== null ? (
            <span className="font-bold text-ink">{VEHICLE_TYPE_LABELS[drive.vehicleType]}</span>
          ) : null}
        </p>
      ) : null}

      {drive.memo ? (
        <p className="mt-3 text-base leading-relaxed break-words whitespace-pre-wrap text-ink">{drive.memo}</p>
      ) : null}
    </article>
  )
}
