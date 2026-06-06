import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarDays,
  Trophy,
  Sparkles,
  BookOpenCheck,
  BookA,
  Target,
  Globe2,
  ArrowRight,
} from 'lucide-react'
import { HomeTemplate } from '@/components/templates/HomeTemplate'
import { HomeHero, type HomeHeroTeam } from '@/components/organisms/HomeHero'
import { FeatureTile } from '@/components/molecules/FeatureTile'
import { DateGroupHeader } from '@/components/molecules/DateGroupHeader'
import {
  MatchCard,
  type MatchCardTeam,
} from '@/components/molecules/MatchCard'
import { getRepository, groupMatchesByDate } from '@/lib/data'
import { KICKOFF_DATE } from '@/lib/constants/tournament'
import type { Match, Stadium, Team } from '@/lib/domain'

// 「直近の試合」抽出・見出し分岐が現在時刻（new Date()）に依存するため、
// 1時間ごとに ISR で再生成して日々の経過に追従させる（完全静的化を避ける）。
export const revalidate = 3600

export const metadata: Metadata = {
  // layout の template（"%s | キックオフ"）に合流。ホームは absolute で完結させる。
  title: {
    absolute: 'キックオフ | 2026 ワールドカップ観戦ガイド',
  },
  description:
    '2026 FIFA ワールドカップの開幕カウントダウン・今日の試合・推し国診断をひとつに。ルールも国も知らない初心者が、最初の3分で「楽しい・わかった」を体験できる統合ハブ。',
  alternates: { canonical: '/' },
}

/** ホームに並べる統合ハブのタイル定義 */
const FEATURE_TILES = [
  {
    href: '/matches',
    icon: CalendarDays,
    label: '今日の試合・日程',
    description: '104試合から今日見るべき試合がわかる',
    tone: 'pitch',
  },
  {
    href: '/bracket',
    icon: Trophy,
    label: 'トーナメント表',
    description: '48カ国がどう優勝まで勝ち上がるか',
    tone: 'gold',
  },
  {
    href: '/diagnosis',
    icon: Sparkles,
    label: '推し国診断',
    description: '質問に答えて応援する国を見つける',
    tone: 'kickoff',
  },
  {
    href: '/rules',
    icon: BookOpenCheck,
    label: 'ルール図鑑',
    description: 'オフサイドもカードもやさしく解説',
    tone: 'pitch',
  },
  {
    href: '/glossary',
    icon: BookA,
    label: '用語じてん',
    description: '知らない言葉をその場で調べる',
    tone: 'gold',
  },
  {
    href: '/predictions',
    icon: Target,
    label: '勝敗予想',
    description: '勝つ国を予想して観戦を自分ごとに',
    tone: 'kickoff',
  },
  {
    href: '/countries',
    icon: Globe2,
    label: '国図鑑',
    description: '出場48カ国の見どころと豆知識',
    tone: 'pitch',
  },
] as const

/** チームを MatchCard 用の最小表示情報に変換（コード未確定は undefined） */
function toCardTeam(
  code: string | null,
  teamByCode: Map<string, Team>,
): MatchCardTeam | undefined {
  if (code == null) return undefined
  const team = teamByCode.get(code)
  if (!team) return undefined
  return { flagEmoji: team.flagEmoji, nameJa: team.nameJa }
}

/** 「直近の試合」を選ぶ: 現在以降で最も早い試合。無ければ開幕の試合（開幕日）を使う。 */
function pickUpcomingMatches(matches: Match[], limit: number): Match[] {
  const sorted = [...matches].sort((a, b) =>
    a.kickoffUtc.localeCompare(b.kickoffUtc),
  )
  const nowIso = new Date().toISOString()
  const upcoming = sorted.filter((m) => m.kickoffUtc >= nowIso)
  const pool = upcoming.length > 0 ? upcoming : sorted
  return pool.slice(0, limit)
}

export default async function HomePage() {
  const repo = getRepository()
  const [teams, stadiums, matches] = await Promise.all([
    repo.getTeams(),
    repo.getStadiums(),
    repo.getMatches(),
  ])

  const teamByCode = new Map<string, Team>(teams.map((t) => [t.code, t]))
  const stadiumById = new Map<string, Stadium>(
    stadiums.map((s) => [s.id, s]),
  )

  // HomeHero（Client）へ渡すシリアライズ可能な最小チーム情報マップ
  const teamsByCode: Record<string, HomeHeroTeam> = {}
  for (const t of teams) {
    teamsByCode[t.code] = {
      code: t.code,
      nameJa: t.nameJa,
      flagEmoji: t.flagEmoji,
    }
  }

  // 直近の試合プレビュー（2〜4件）。Server で code→表示情報・会場名を解決して渡す。
  const previewMatches = pickUpcomingMatches(matches, 4)
  const previewGroups = groupMatchesByDate(previewMatches)

  return (
    <div className="py-5">
      <HomeTemplate hero={<HomeHero teamsByCode={teamsByCode} />}>
        {/* ── 統合ハブのタイル ── */}
        <section aria-labelledby="hub-heading">
          <h2
            id="hub-heading"
            className="mb-3 text-sm font-bold text-text"
          >
            やりたいことから始める
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURE_TILES.map((tile) => (
              <FeatureTile
                key={tile.href}
                href={tile.href}
                icon={tile.icon}
                label={tile.label}
                description={tile.description}
                tone={tile.tone}
              />
            ))}
          </div>
        </section>

        {/* ── 直近の試合プレビュー ── */}
        <section aria-labelledby="preview-heading">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2
              id="preview-heading"
              className="text-sm font-bold text-text"
            >
              {new Date().toISOString() >= KICKOFF_DATE
                ? 'これからの試合'
                : 'まもなく開幕！注目の試合'}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {previewGroups.map((group) => (
              <div key={group.dateKey} className="flex flex-col gap-2">
                <DateGroupHeader
                  isoDate={group.matches[0].kickoffUtc}
                  matchCount={group.matches.length}
                />
                {group.matches.map((m) => {
                  const stadium =
                    m.stadiumId != null
                      ? stadiumById.get(m.stadiumId)
                      : undefined
                  return (
                    <MatchCard
                      key={m.id}
                      home={toCardTeam(m.homeTeamCode, teamByCode)}
                      away={toCardTeam(m.awayTeamCode, teamByCode)}
                      homePlaceholder={m.homePlaceholderJa}
                      awayPlaceholder={m.awayPlaceholderJa}
                      kickoffUtc={m.kickoffUtc}
                      stadiumName={stadium?.name ?? null}
                      roundLabelJa={m.roundLabelJa}
                      score={m.score}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <Link
            href="/matches"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text transition-colors hover:bg-pitch-50"
          >
            すべての試合を見る
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      </HomeTemplate>
    </div>
  )
}
