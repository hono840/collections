import { ROAD_INFO_ITEMS, type RoadInfoItem } from '@/lib/validation/road-info'
import type { RoadInfoItems, RoadInfoItemStatus } from '@/types/drive'

// Latest road info per item + staleness (PRD US-10). Pure.

/** One road_info row (= one drive's snapshot). Item status null = 記録しない. */
export type RoadInfoRecord = {
  confirmedOn: string
  createdAt: string
  items: RoadInfoItems
}

export type LatestRoadInfoItem<TItem extends RoadInfoItem = RoadInfoItem> = {
  status: RoadInfoItemStatus<TItem>
  memo: string
  confirmedOn: string
}

/** null = never recorded (shown as 未記録, distinct from 不明). Key order = ROAD_INFO_ITEMS. */
export type LatestRoadInfo = { [TItem in RoadInfoItem]: LatestRoadInfoItem<TItem> | null }

function isNewer(candidate: RoadInfoRecord, current: RoadInfoRecord): boolean {
  if (candidate.confirmedOn !== current.confirmedOn) return candidate.confirmedOn > current.confirmedOn
  return Date.parse(candidate.createdAt) > Date.parse(current.createdAt)
}

/** Per item, the newest record (confirmedOn, then createdAt) that recorded it. Input order does not matter. */
export function pickLatestRoadInfo(records: ReadonlyArray<RoadInfoRecord>): LatestRoadInfo {
  const latest = {} as Record<RoadInfoItem, LatestRoadInfoItem | null>
  for (const item of ROAD_INFO_ITEMS) {
    let winner: RoadInfoRecord | null = null
    for (const record of records) {
      if (record.items[item].status === null) continue
      if (winner === null || isNewer(record, winner)) winner = record
    }
    const value = winner?.items[item]
    latest[item] =
      winner && value && value.status !== null
        ? { status: value.status, memo: value.memo, confirmedOn: winner.confirmedOn }
        : null
  }
  return latest as LatestRoadInfo
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function toUtcDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY
}

/** Calendar-day difference (to - from) between two YYYY-MM-DD dates, independent of time zones / DST. */
export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round(toUtcDayNumber(toIsoDate) - toUtcDayNumber(fromIsoDate))
}

export const STALE_AFTER_DAYS = 366

/** true when the confirmation is 366 days old or more (古い情報の警告). */
export function isStaleConfirmation(confirmedOn: string, today: string): boolean {
  return daysBetween(confirmedOn, today) >= STALE_AFTER_DAYS
}
