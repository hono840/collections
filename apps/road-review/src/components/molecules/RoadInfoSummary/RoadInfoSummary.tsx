import { Clock } from 'lucide-react'
import { PenLine } from 'lucide-react'
import {
  PRESENCE_STATUS_LABELS,
  ROAD_INFO_ITEM_LABELS,
  TOLL_STATUS_LABELS,
  UNRECORDED_LABEL,
} from '@/lib/constants/labels'
import { isStaleConfirmation, type LatestRoadInfo } from '@/lib/road-info/latest'
import { todayInTokyo } from '@/lib/utils/date'
import { FACILITY_ITEMS, ROAD_INFO_ITEMS, ROAD_RULE_ITEMS, type RoadInfoItem } from '@/lib/validation/road-info'
import { cn } from '@/lib/utils/cn'

export type RoadInfoSummaryProps = {
  info: LatestRoadInfo
  /** YYYY-MM-DD used for the "1年以上" check. Defaults to today in JST. */
  today?: string
  className?: string
}

/** M-06 */
export const ROAD_INFO_NOTE = 'これはあなた自身の記録で、公式情報ではありません。お出かけ前に道路管理者の公式情報を確認してください。'
/** E-05 */
const EMPTY_MESSAGE = 'まだ道の情報が記録されていません。通行止めや駐車場などを確認したら、記録しておきましょう。'

function statusLabel(item: RoadInfoItem, status: string): string {
  const labels: Readonly<Record<string, string>> = item === 'toll' ? TOLL_STATUS_LABELS : PRESENCE_STATUS_LABELS
  return labels[status] ?? status
}

function InfoRow({ item, info, today }: { item: RoadInfoItem; info: LatestRoadInfo; today: string }) {
  const value = info[item]
  const label = ROAD_INFO_ITEM_LABELS[item]

  if (value === null) {
    return (
      <li className="flex min-h-11 flex-wrap items-center gap-x-3 py-2">
        <span className="w-28 shrink-0 text-sm text-ink-muted">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
          <span aria-hidden="true" className="size-3 rounded-full border border-dashed border-line-strong" />
          {UNRECORDED_LABEL}
        </span>
      </li>
    )
  }

  const stale = isStaleConfirmation(value.confirmedOn, today)
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="w-28 shrink-0 text-sm text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 text-sm break-words text-ink">
        <span className="font-bold">
          {statusLabel(item, value.status)}
          {value.memo ? `（${value.memo}）` : null}
        </span>
        <span className="text-xs text-ink-muted">
          ・確認日 <span className="num">{value.confirmedOn}</span>
        </span>
      </span>
      {stale ? (
        <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-warning-subtle px-2 text-xs text-warning">
          <Clock aria-hidden="true" className="size-3.5" />
          確認から1年以上たっています
          <span className="sr-only">最新の情報ではない可能性があります。</span>
        </span>
      ) : null}
    </li>
  )
}

function ItemGroup({
  id,
  title,
  items,
  info,
  today,
}: {
  id: string
  title: string
  items: readonly RoadInfoItem[]
  info: LatestRoadInfo
  today: string
}) {
  return (
    <div className="mt-4">
      <h3 id={id} className="flex items-center gap-2 text-xs font-bold text-ink-muted">
        {title}
        <span className="h-px flex-1 bg-line" />
      </h3>
      <ul aria-labelledby={id} className="divide-y divide-line">
        {items.map((item) => (
          <InfoRow key={item} item={item} info={info} today={today} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Latest road info per item (PRD US-10; UX 3.1 S-06; spec 4-6 RoadInfoCard). Server molecule.
 * Always shows the "ユーザー記録" label and the M-06 note. Values are words (never color only);
 * items confirmed 366+ days ago get the "確認から1年以上たっています" tag.
 */
export function RoadInfoSummary({ info, today, className }: RoadInfoSummaryProps) {
  const referenceDay = today ?? todayInTokyo()
  const hasAny = ROAD_INFO_ITEMS.some((item) => info[item] !== null)

  return (
    <section
      aria-labelledby="road-info-heading"
      className={cn('rounded-md border border-line bg-surface-sunken p-4', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="road-info-heading" className="text-base font-bold text-ink">
          道の情報
        </h2>
        <span className="inline-flex min-h-5.5 items-center gap-1 rounded-full border border-ink-muted px-2 text-xs text-ink-muted">
          <PenLine aria-hidden="true" className="size-3.5" />
          ユーザー記録
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{ROAD_INFO_NOTE}</p>

      {hasAny ? (
        <>
          <ItemGroup id="road-info-rules-heading" title="通行ルール" items={ROAD_RULE_ITEMS} info={info} today={referenceDay} />
          <ItemGroup id="road-info-facilities-heading" title="施設" items={FACILITY_ITEMS} info={info} today={referenceDay} />
        </>
      ) : (
        <p className="mt-4 text-sm text-ink">{EMPTY_MESSAGE}</p>
      )}
    </section>
  )
}
