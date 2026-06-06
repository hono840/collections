/**
 * データアクセス層の公開エントリ。
 * Server Component は getRepository() 経由でのみデータにアクセスする（JSON直importは禁止）。
 * 将来は環境変数 / feature flag で liveRepository に差し替える。
 */
import type { WorldCupRepository } from './repository'
import { staticRepository } from './static-repository'

export function getRepository(): WorldCupRepository {
  return staticRepository
}

export type { WorldCupRepository } from './repository'
export {
  computeStandings,
  groupMatchesByDate,
  type MatchDateGroup,
} from './matches'
