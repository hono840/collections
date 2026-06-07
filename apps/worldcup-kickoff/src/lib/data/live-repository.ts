/**
 * ライブスコア対応リポジトリ（雛形 / #30）。
 *
 * `WorldCupRepository` を実装するデコレータ。base（既定は staticRepository）を包み、
 * - 静的コンテンツ系メソッド（チーム・グループ・会場・選手・用語・ルール）は base へそのまま委譲し、
 * - 試合・順位など「ライブ反映の対象になりうる」メソッドだけ、ライブスナップショットを取得して
 *   静的結果にマージする。
 *
 * 設計上の最優先事項は **可用性** で、ライブ取得が失敗・無効でも必ず base の静的結果へ
 * フォールバックする（外部API障害でアプリが落ちないこと）。現時点では `fetchLiveSnapshot()`
 * はスタブで、環境変数が未設定なら常に null を返す（= 完全に静的と同挙動）。
 *
 * 採用API候補・キャッシュ/再検証方針・取得設計の評価は docs/live-score-api-evaluation.md を参照。
 */
import type {
  CountryCode,
  Group,
  GroupId,
  GroupStanding,
  Match,
  Player,
  RuleLesson,
  Stadium,
  Team,
  Term,
} from '@/lib/domain'
import type { WorldCupRepository } from './repository'
import { staticRepository } from './static-repository'

/**
 * ライブAPIから一度に取得するスナップショット（雛形）。
 *
 * 試合の最新スコア／ステータスや順位など、ライブ反映の対象を1リクエストにまとめて持つ想定。
 * 実装時は openfootball 形式ではなく、採用API（下記候補）のレスポンスを内部ドメイン型へ
 * 正規化したうえでここに格納する。
 *
 * - matchesById: Match.id（"wc-001"形式）→ 最新試合状態。base の試合に上書きマージする。
 * - standingsByGroup: GroupId → ライブ順位。存在すれば computeStandings の代わりに採用する。
 */
interface LiveSnapshot {
  /** Match.id → ライブ反映済みの試合。base に存在するもののみ上書きする想定 */
  matchesById: Map<string, Match>
  /** GroupId → ライブ順位表。無ければ base（静的計算）にフォールバック */
  standingsByGroup: Map<GroupId, GroupStanding[]>
}

/**
 * ライブスナップショットを取得する（**現時点ではスタブ**）。
 *
 * 実API呼び出しは行わない。サーバー専用の環境変数が未設定なら即 null を返し、
 * 呼び出し側は base（静的）へフォールバックする。
 *
 * --- 実装方針（TODO / #30 本実装時） ---
 * - **サーバー専用 fetch**: この関数はサーバー（Server Component / Route Handler）からのみ
 *   呼ばれる。APIキーは下記のとおりサーバー専用 env で参照し、クライアントへは絶対に渡さない。
 * - **キャッシュ / 再検証**: 改変版 Next の data fetching ガイド
 *   （node_modules/next/dist/docs/）を必ず確認したうえで、`fetch` の revalidate（時間ベース ISR）
 *   もしくはタグ再検証を用い、試合中のみ短い間隔で再取得する。SSG ページの挙動を壊さないこと。
 * - **採用API候補**: docs/live-score-api-evaluation.md にて評価中
 *   （例: API-Football / football-data.org / openfootball 更新フィード 等）。
 * - **正規化**: 取得レスポンスは内部ドメイン型（Match / GroupStanding）へ正規化してから返す。
 * - **失敗時**: 例外は内部で握り潰し、必ず null を返す（呼び出し側の静的フォールバックに委ねる）。
 */
async function fetchLiveSnapshot(): Promise<LiveSnapshot | null> {
  // キーは必ずサーバー専用（NEXT_PUBLIC_ 接頭辞を使わない）。env はサーバーでのみ参照する。
  const apiKey = process.env.WORLDCUP_LIVE_API_KEY
  const apiBase = process.env.WORLDCUP_LIVE_API_BASE

  // 未設定なら即 null（= 静的と完全に同挙動）。実APIは呼ばない。
  if (!apiKey || !apiBase) {
    return null
  }

  try {
    // TODO(#30): ここで実API（apiBase）をサーバー専用 fetch で呼び、
    //   レスポンスを LiveSnapshot へ正規化して返す。
    //   現時点では実装せず、設定があっても安全側に倒して null を返す。
    return null
  } catch (error) {
    // 障害は記録だけして握り潰し、静的フォールバックへ。
    console.error('[live-repository] fetchLiveSnapshot に失敗しました', error)
    return null
  }
}

/**
 * base の試合配列にライブスナップショットを上書きマージする。
 * snapshot が null、または該当試合がスナップショットに無ければ base の値を保つ。
 */
function mergeMatches(base: Match[], snapshot: LiveSnapshot | null): Match[] {
  if (!snapshot) return base
  return base.map((m) => snapshot.matchesById.get(m.id) ?? m)
}

/**
 * ライブ対応リポジトリを生成する。
 *
 * @param base 委譲先（既定は静的リポジトリ）。テスト時は差し替え可能。
 */
export function createLiveRepository(
  base: WorldCupRepository = staticRepository,
): WorldCupRepository {
  return {
    // ── 静的コンテンツ系: そのまま委譲（ライブ反映なし） ──
    getTeams(): Promise<Team[]> {
      return base.getTeams()
    },

    getTeamByCode(code: CountryCode): Promise<Team | null> {
      return base.getTeamByCode(code)
    },

    getGroups(): Promise<Group[]> {
      return base.getGroups()
    },

    getStadiums(): Promise<Stadium[]> {
      return base.getStadiums()
    },

    getPlayersByTeam(code: CountryCode): Promise<Player[]> {
      return base.getPlayersByTeam(code)
    },

    getTerms(): Promise<Term[]> {
      return base.getTerms()
    },

    getRuleLessons(): Promise<RuleLesson[]> {
      return base.getRuleLessons()
    },

    getRuleLesson(slug: string): Promise<RuleLesson | null> {
      return base.getRuleLesson(slug)
    },

    // ── ライブ反映の対象: 取得を try し、失敗・無効なら必ず base へフォールバック ──
    async getMatches(): Promise<Match[]> {
      const baseMatches = await base.getMatches()
      try {
        const snapshot = await fetchLiveSnapshot()
        return mergeMatches(baseMatches, snapshot)
      } catch (error) {
        console.error('[live-repository] getMatches フォールバック', error)
        return baseMatches
      }
    },

    async getMatchesByGroup(groupId: GroupId): Promise<Match[]> {
      const baseMatches = await base.getMatchesByGroup(groupId)
      try {
        const snapshot = await fetchLiveSnapshot()
        return mergeMatches(baseMatches, snapshot)
      } catch (error) {
        console.error(
          '[live-repository] getMatchesByGroup フォールバック',
          error,
        )
        return baseMatches
      }
    },

    async getMatchesByTeam(code: CountryCode): Promise<Match[]> {
      const baseMatches = await base.getMatchesByTeam(code)
      try {
        const snapshot = await fetchLiveSnapshot()
        return mergeMatches(baseMatches, snapshot)
      } catch (error) {
        console.error('[live-repository] getMatchesByTeam フォールバック', error)
        return baseMatches
      }
    },

    async getKnockoutMatches(): Promise<Match[]> {
      const baseMatches = await base.getKnockoutMatches()
      try {
        const snapshot = await fetchLiveSnapshot()
        return mergeMatches(baseMatches, snapshot)
      } catch (error) {
        console.error(
          '[live-repository] getKnockoutMatches フォールバック',
          error,
        )
        return baseMatches
      }
    },

    async getGroupStandings(groupId: GroupId): Promise<GroupStanding[]> {
      const baseStandings = await base.getGroupStandings(groupId)
      try {
        const snapshot = await fetchLiveSnapshot()
        // ライブ順位があればそれを採用、無ければ静的計算（base）へフォールバック。
        return snapshot?.standingsByGroup.get(groupId) ?? baseStandings
      } catch (error) {
        console.error('[live-repository] getGroupStandings フォールバック', error)
        return baseStandings
      }
    },
  }
}
