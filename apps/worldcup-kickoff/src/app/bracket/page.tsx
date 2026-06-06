import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Info, Table2 } from 'lucide-react'
import { getRepository } from '@/lib/data'
import { STAGE_LABELS } from '@/lib/constants/tournament'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import {
  BracketView,
  type BracketMatch,
  type BracketRound,
} from '@/components/organisms/BracketView'
import type { CountryCode, Match, MatchStage, Team } from '@/lib/domain'

export const metadata: Metadata = {
  title: 'トーナメント表',
  description:
    '2026 FIFA ワールドカップ決勝トーナメント（ラウンド32〜決勝）のブラケット。12組×4チームから勝ち上がる32チームの組み合わせを、トーナメント表でわかりやすく表示します。',
}

/** 本線で表示するラウンドの順序（3位決定戦は別枠） */
const MAIN_STAGES: MatchStage[] = [
  'round32',
  'round16',
  'quarter',
  'semi',
  'final',
]

function toTeamView(
  team: Team | undefined,
): { flagEmoji: string; nameJa: string } | null {
  if (!team) return null
  return { flagEmoji: team.flagEmoji, nameJa: team.nameJa }
}

/** Match → ブラケット用ビュー型 */
function toBracketMatch(
  m: Match,
  teamByCode: Map<CountryCode, Team>,
): BracketMatch {
  return {
    id: m.id,
    home: toTeamView(m.homeTeamCode ? teamByCode.get(m.homeTeamCode) : undefined),
    away: toTeamView(m.awayTeamCode ? teamByCode.get(m.awayTeamCode) : undefined),
    homePlaceholder: m.homePlaceholderJa,
    awayPlaceholder: m.awayPlaceholderJa,
    score: m.score,
    ...(m.penalties ? { penalties: m.penalties } : {}),
  }
}

/**
 * ブラケットページ（Server Component）。
 * 決勝T試合を取得し、ステージごとの列（ラウンド）に整理して BracketView へ渡す。
 * 順位表はビュー重複を避け /countries へ誘導する。
 */
export default async function BracketPage() {
  const repo = getRepository()
  const [knockout, teams] = await Promise.all([
    repo.getKnockoutMatches(),
    repo.getTeams(),
  ])

  const teamByCode = new Map<CountryCode, Team>(teams.map((t) => [t.code, t]))

  const byStage = new Map<MatchStage, Match[]>()
  for (const m of knockout) {
    const list = byStage.get(m.stage)
    if (list) list.push(m)
    else byStage.set(m.stage, [m])
  }
  // 各ステージ内はキックオフ昇順で安定化
  for (const list of byStage.values()) {
    list.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
  }

  const rounds: BracketRound[] = MAIN_STAGES.filter((stage) =>
    byStage.has(stage),
  ).map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    matches: (byStage.get(stage) ?? []).map((m) =>
      toBracketMatch(m, teamByCode),
    ),
  }))

  const thirdMatches = byStage.get('third') ?? []
  const thirdPlace: BracketRound | null =
    thirdMatches.length > 0
      ? {
          stage: 'third',
          label: STAGE_LABELS.third,
          matches: thirdMatches.map((m) => toBracketMatch(m, teamByCode)),
        }
      : null

  return (
    <div className="flex flex-col gap-6 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-text">トーナメント表</h1>
        <p className="text-sm text-text-muted">
          グループステージを勝ち抜いた32チームによる一発勝負。優勝までの道のりを見てみましょう。
        </p>
      </header>

      {/* W杯の仕組み（初心者向け簡易説明） */}
      <Card padding="lg" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-pitch-600" aria-hidden />
          <h2 className="text-base font-bold text-text">W杯の仕組み</h2>
        </div>
        <p className="text-sm leading-relaxed text-text-muted">
          まず<strong className="text-text">12のグループ</strong>に
          <strong className="text-text">4チームずつ（計48チーム）</strong>
          が分かれて総当たり戦をします。各グループの
          <strong className="text-text">上位2チーム（24チーム）</strong>
          に、成績の良い
          <strong className="text-text">3位8チーム</strong>
          を加えた<strong className="text-text">合計32チーム</strong>
          が「ラウンド32」へ進みます。ここからは負けたら終わりの
          トーナメント（ラウンド32 → ラウンド16 → 準々決勝 → 準決勝 → 決勝）です。
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="pitch">48チーム</Badge>
          <ArrowRight
            className="h-3.5 w-3.5 text-text-muted"
            aria-label="から"
          />
          <Badge variant="gold">32チームが決勝T</Badge>
        </div>
        <Link
          href="/rules/tournament-format"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-pitch-700 underline-offset-2 hover:underline focus-visible:underline"
        >
          トーナメントの仕組みをくわしく見る
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Card>

      {/* トーナメント表 */}
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label="決勝トーナメント表"
      >
        <BracketView rounds={rounds} thirdPlace={thirdPlace} />
      </section>

      {/* グループ順位表への誘導（重複実装回避のため /countries へ） */}
      <Card padding="lg" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 shrink-0 text-pitch-600" aria-hidden />
          <h2 className="text-base font-bold text-text">グループ順位表</h2>
        </div>
        <p className="text-sm text-text-muted">
          各グループの順位や所属チームは、国図鑑のグループ一覧で確認できます。
        </p>
        <Link
          href="/countries"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-pitch-700 underline-offset-2 hover:underline focus-visible:underline"
        >
          グループ・順位表を見る（国図鑑）
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Card>
    </div>
  )
}
