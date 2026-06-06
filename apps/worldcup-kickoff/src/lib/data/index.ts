/**
 * データアクセス層の公開エントリ。
 * Server Component は getRepository() 経由でのみデータにアクセスする（JSON直importは禁止）。
 *
 * 環境変数フラグ WORLDCUP_LIVE_SCORES === 'on' のときだけライブ対応リポジトリを使う。
 * 既定（未設定/その他）は static で、現状と完全に同一挙動（SSG に影響なし）。
 * このフラグはサーバー専用（NEXT_PUBLIC_ 接頭辞を付けない）。env はサーバーでのみ参照する。
 */
import type { WorldCupRepository } from './repository'
import { staticRepository } from './static-repository'
import { createLiveRepository } from './live-repository'

export function getRepository(): WorldCupRepository {
  if (process.env.WORLDCUP_LIVE_SCORES === 'on') {
    return createLiveRepository(staticRepository)
  }
  return staticRepository
}

export type { WorldCupRepository } from './repository'
export {
  computeStandings,
  groupMatchesByDate,
  type MatchDateGroup,
} from './matches'
