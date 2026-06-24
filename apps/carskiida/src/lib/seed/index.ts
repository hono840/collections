import type { CarModel } from '@/types/car'
import { roadster } from './roadster'
import { breadthModels } from './breadth'

/**
 * シード登録。
 * Sprint 1 はこのインメモリ集合を唯一のデータソースとする。
 * Sprint 3 以降、ここを Supabase（vPIC/Wikidata ETL）に置き換える。
 */
export const seedModels: CarModel[] = [roadster, ...breadthModels]
