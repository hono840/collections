import { SPOTS_DATA_VERSION } from './types'
import type { Category, Spot, SpotsData } from './types'

// The `seed` array of docs/design/Main.dc.html, in design order (AC1).
// Distance, 降りるIC and season are empty for every row (AC46).
const SEED_ROWS: ReadonlyArray<readonly [name: string, region: string, category: Category, memo: string]> = [
  ['ヤビツ峠', '神奈川', '峠', '峠のホームコースにしたい'],
  ['箱根ターンパイク', '神奈川', '絶景ロード', ''],
  ['箱根スカイライン', '静岡・神奈川', '絶景ロード', ''],
  ['富士スピードウェイ', '静岡', 'サーキット', ''],
  ['伊豆スカイライン', '静岡', '絶景ロード', ''],
  ['西伊豆スカイライン', '静岡', '絶景ロード', ''],
  ['奥多摩', '東京', '峠', ''],
  ['首都高（都心環状線）', '東京', '都市高速', ''],
  ['赤城山', '群馬', '峠', ''],
  ['榛名山', '群馬', '峠', ''],
  ['碓氷峠', '群馬・長野', '峠', ''],
  ['志賀草津高原ルート', '群馬・長野', '絶景ロード', '冬は通行止めの期間あり。行く前に通れるか確認'],
  ['ビーナスライン', '長野', '絶景ロード', ''],
  ['いろは坂', '栃木', '峠', ''],
  ['中禅寺湖スカイライン', '栃木', '絶景ロード', ''],
  ['筑波パープルライン', '茨城', '絶景ロード', ''],
  ['銚子ドーバーライン', '千葉', '海沿い', ''],
  ['九十九里浜', '千葉', '海沿い', ''],
  ['伊吹山ドライブウェイ', '岐阜・滋賀', '絶景ロード', ''],
]

/** The 19 design spots with ids 1-19 and nextId 20, as version 2. Builds new objects on every call. */
export function createSeedData(): SpotsData {
  const spots: Spot[] = SEED_ROWS.map(([name, region, category, memo], index) => ({
    id: index + 1,
    name,
    region,
    category,
    distanceKm: '',
    exitInterchange: '',
    season: '',
    memo,
    done: false,
  }))
  return { version: SPOTS_DATA_VERSION, nextId: spots.length + 1, spots }
}
