import type { TrafficLevel } from '@/types/drive'

// Rating averages (PRD US-07 / US-08, design spec 4-2 RatingMeter). Pure; shared by server and UI.

const METER_CELLS = 5

/** "合計×10 ÷ 件数を整数に四捨五入" ÷ 10 (PRD US-07). Integer math avoids float drift (3.65 -> 3.7). null when count is 0. */
export function roundedAverage(sum: number, count: number): number | null {
  if (count <= 0) return null
  return Math.round((sum * 10) / count) / 10
}

/** One decimal ('4.0', '3.7'); null -> '—'. */
export function formatAverage(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

/** Cells to fill out of 5: round half up of the displayed one-decimal value. null -> 0. */
export function meterFillCount(value: number | null): number {
  if (value === null) return 0
  const displayed = Number(value.toFixed(1))
  return Math.min(METER_CELLS, Math.max(0, Math.round(displayed)))
}

export type RatingAggregate = { average: number | null; count: number }

export type DriveRatingSummary = {
  overall: RatingAggregate
  scenery: RatingAggregate
  roadSurface: RatingAggregate
  easeOfDriving: RatingAggregate
  /** Counted per level, never averaged (a situation, not a score). */
  traffic: Record<TrafficLevel, number>
}

type RatedDrive = {
  ratingOverall: number
  ratingScenery: number | null
  ratingRoadSurface: number | null
  ratingEaseOfDriving: number | null
  traffic: TrafficLevel | null
}

function aggregate(values: Array<number | null>): RatingAggregate {
  const rated = values.filter((value): value is number => value !== null)
  const sum = rated.reduce((total, value) => total + value, 0)
  return { average: roundedAverage(sum, rated.length), count: rated.length }
}

/** Per-axis averages (null ratings excluded from both average and count) and traffic counts. */
export function summarizeDrives(drives: ReadonlyArray<RatedDrive>): DriveRatingSummary {
  const traffic: Record<TrafficLevel, number> = { few: 0, normal: 0, many: 0 }
  for (const drive of drives) {
    if (drive.traffic !== null) traffic[drive.traffic] += 1
  }
  return {
    overall: aggregate(drives.map((drive) => drive.ratingOverall)),
    scenery: aggregate(drives.map((drive) => drive.ratingScenery)),
    roadSurface: aggregate(drives.map((drive) => drive.ratingRoadSurface)),
    easeOfDriving: aggregate(drives.map((drive) => drive.ratingEaseOfDriving)),
    traffic,
  }
}
