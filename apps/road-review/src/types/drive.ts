import type { TrafficLevel, VehicleType, Weather } from '@/lib/validation/drive'
import type { PresenceStatus, RoadInfoItem, TollStatus } from '@/lib/validation/road-info'

export type { TrafficLevel, VehicleType, Weather } from '@/lib/validation/drive'
export type { PresenceStatus, RoadInfoItem, RoadInfoStatus, TollStatus } from '@/lib/validation/road-info'

/** A drive record as shown on the road detail / edit pages. Never carries user_id / visibility. */
export type Drive = {
  id: string
  roadId: string
  drivenOn: string
  vehicleType: VehicleType | null
  weather: Weather | null
  ratingOverall: number
  ratingScenery: number | null
  ratingRoadSurface: number | null
  ratingEaseOfDriving: number | null
  traffic: TrafficLevel | null
  memo: string
  createdAt: string
  updatedAt: string
}

/** Status of one road info item; toll uses 有料/無料/不明, the others あり/なし/不明. null = 記録しない. */
export type RoadInfoItemStatus<TItem extends RoadInfoItem> = TItem extends 'toll' ? TollStatus : PresenceStatus

export type RoadInfoItemValue<TItem extends RoadInfoItem = RoadInfoItem> = {
  status: RoadInfoItemStatus<TItem> | null
  memo: string
}

export type RoadInfoItems = { [TItem in RoadInfoItem]: RoadInfoItemValue<TItem> }

/** One road_info row (= one drive's snapshot). */
export type RoadInfoValues = {
  confirmedOn: string
  items: RoadInfoItems
}

export type DriveWithRoadInfo = Drive & { roadInfo: RoadInfoValues | null }

/** Rating axes (labels in lib/constants/labels.ts). */
export type RatingAxis = 'overall' | 'scenery' | 'roadSurface' | 'easeOfDriving'
