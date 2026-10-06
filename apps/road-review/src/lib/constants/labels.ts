import type { RoadType } from '@/types/road'

// Japanese labels for roads.road_type. No speed / racing words (PRD US-14).
export const ROAD_TYPE_LABELS = {
  pass: '峠',
  skyline: 'スカイライン',
  coastal: '海岸線',
  forest: '林道',
  other: 'その他',
} as const satisfies Record<RoadType, string>

// Same order as ROAD_TYPES (PRD order).
export const ROAD_TYPE_OPTIONS: ReadonlyArray<{ value: RoadType; label: string }> = [
  { value: 'pass', label: ROAD_TYPE_LABELS.pass },
  { value: 'skyline', label: ROAD_TYPE_LABELS.skyline },
  { value: 'coastal', label: ROAD_TYPE_LABELS.coastal },
  { value: 'forest', label: ROAD_TYPE_LABELS.forest },
  { value: 'other', label: ROAD_TYPE_LABELS.other },
]
