import { TRAFFIC_LEVELS, VEHICLE_TYPES, WEATHERS } from '@/lib/validation/drive'
import type { PresenceStatus, RatingAxis, RoadInfoItem, TollStatus, TrafficLevel, VehicleType, Weather } from '@/types/drive'
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

// ---------------------------------------------------------------------------
// Sprint 3: drive / rating / road info labels (PRD 11, US-06, US-10; UX 6, M-35).
// No speed / racing words (PRD US-14).
// ---------------------------------------------------------------------------

export const VEHICLE_TYPE_LABELS = {
  car: '四輪',
  motorcycle: '二輪',
} as const satisfies Record<VehicleType, string>

export const WEATHER_LABELS = {
  sunny: '晴',
  cloudy: '曇',
  rain: '雨',
  snow: '雪',
  other: 'その他',
} as const satisfies Record<Weather, string>

export const TRAFFIC_LABELS = {
  few: '少',
  normal: '普通',
  many: '多',
} as const satisfies Record<TrafficLevel, string>

/** M-35: traffic is a record of the day, not a score. */
export const TRAFFIC_NOTE = 'その日の状況の記録です（良い・悪いの評価ではありません）'

function toOptions<TValue extends string>(
  values: ReadonlyArray<TValue>,
  labels: Record<TValue, string>,
): ReadonlyArray<{ value: TValue; label: string }> {
  return values.map((value) => ({ value, label: labels[value] }))
}

export const VEHICLE_TYPE_OPTIONS = toOptions(VEHICLE_TYPES, VEHICLE_TYPE_LABELS)
export const WEATHER_OPTIONS = toOptions(WEATHERS, WEATHER_LABELS)
export const TRAFFIC_OPTIONS = toOptions(TRAFFIC_LEVELS, TRAFFIC_LABELS)

export const RATING_AXIS_LABELS = {
  overall: '総合',
  scenery: '景観',
  roadSurface: '路面状態',
  easeOfDriving: '走りやすさ（道幅・見通し）',
} as const satisfies Record<RatingAxis, string>

/** Words for ratings 1..5 (index 0..4), PRD 11-A. */
export const RATING_SCALE_LABELS = {
  overall: ['いまひとつ', 'やや物足りない', 'ふつう', '良い', 'とても良い'],
  scenery: ['いまひとつ', 'やや物足りない', 'ふつう', '良い', 'とても良い'],
  roadSurface: ['荒れている', 'やや荒れ', 'ふつう', '良好', 'とても良好'],
  easeOfDriving: ['走りにくい', 'やや走りにくい', 'ふつう', '走りやすい', 'とても走りやすい'],
} as const satisfies Record<RatingAxis, readonly [string, string, string, string, string]>

export const ROAD_INFO_ITEM_LABELS = {
  motorcycleBan: '二輪通行止め',
  nightClosure: '夜間通行止め',
  winterClosure: '冬季閉鎖',
  toll: '有料',
  parking: '駐車場',
  toilet: 'トイレ',
  michiNoEki: '道の駅',
  observatory: '展望台',
} as const satisfies Record<RoadInfoItem, string>

export const PRESENCE_STATUS_LABELS = {
  yes: 'あり',
  no: 'なし',
  unknown: '不明',
} as const satisfies Record<PresenceStatus, string>

export const TOLL_STATUS_LABELS = {
  paid: '有料',
  free: '無料',
  unknown: '不明',
} as const satisfies Record<TollStatus, string>

/** Input option: do not record this item. */
export const NOT_RECORDED_LABEL = '記録しない'
/** Display (M-26): the item has never been recorded for this road. */
export const UNRECORDED_LABEL = '未記録'
