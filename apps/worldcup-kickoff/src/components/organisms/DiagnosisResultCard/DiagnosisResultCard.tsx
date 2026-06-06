'use client'

import Link from 'next/link'
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { CountryFlag } from '@/components/atoms/CountryFlag'
import { Badge } from '@/components/atoms/Badge'
import { Tag } from '@/components/atoms/Tag'
import { Button } from '@/components/atoms/Button'
import { ShareButton } from '@/components/molecules/ShareButton'
import { useFavoriteTeamContext } from '@/components/providers/FavoriteTeamProvider'
import { cn } from '@/lib/utils/cn'
import type { Team, TeamTier } from '@/lib/domain'

export interface DiagnosisResultCardProps {
  /** 推し国（第1候補）。null は解決不能（基本起きない） */
  topTeam: Team | null
  /** 上位候補（第1候補を除く。表示順） */
  runnerUps: Team[]
  /** もう一度診断する */
  onRetry: () => void
  className?: string
}

const TIER_META: Record<
  TeamTier,
  { label: string; variant: 'gold' | 'pitch' | 'neutral' }
> = {
  favorite: { label: '優勝候補', variant: 'gold' },
  darkhorse: { label: 'ダークホース', variant: 'pitch' },
  underdog: { label: 'チャレンジャー', variant: 'neutral' },
}

/**
 * 推し国診断の結果カード。第1候補を大きく表示し、上位候補・推し国登録・国詳細リンク・
 * シェアを提供する。推し国の状態は Context 経由で localStorage に保存。Client Component。
 */
export function DiagnosisResultCard({
  topTeam,
  runnerUps,
  onRetry,
  className,
}: DiagnosisResultCardProps) {
  const { isFavorite, setFavoriteTeam, mounted } = useFavoriteTeamContext()

  if (!topTeam) {
    return (
      <Card padding="lg" className={cn('text-center', className)}>
        <p className="text-sm text-text-muted">
          結果を計算できませんでした。もう一度お試しください。
        </p>
        <Button
          variant="secondary"
          onClick={onRetry}
          className="mt-3"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          もう一度診断する
        </Button>
      </Card>
    )
  }

  const tierMeta = TIER_META[topTeam.tier]
  const alreadyFavorite = mounted && isFavorite(topTeam.code)
  const shareText = `私の推し国は${topTeam.nameJa}！あなたの推し国も診断してみよう ⚽`

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ── 第1候補（メイン）── */}
      <Card
        highlighted
        padding="lg"
        className="flex flex-col items-center gap-3 text-center"
      >
        <span className="flex items-center gap-1.5 text-sm font-bold text-gold-600">
          <Sparkles className="h-4 w-4" aria-hidden />
          あなたの推し国は
        </span>
        <CountryFlag
          flagEmoji={topTeam.flagEmoji}
          nameJa={topTeam.nameJa}
          size="xl"
        />
        <h2 className="text-3xl font-extrabold text-text">{topTeam.nameJa}</h2>
        <Badge variant={tierMeta.variant}>{tierMeta.label}</Badge>
        <p className="text-sm leading-relaxed text-text">{topTeam.blurbJa}</p>
        {topTeam.vibeJa.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1.5">
            {topTeam.vibeJa.slice(0, 4).map((vibe) => (
              <Tag key={vibe}>{vibe}</Tag>
            ))}
          </div>
        ) : null}

        {/* アクション */}
        <div className="mt-1 flex w-full flex-col gap-2">
          <Button
            variant={alreadyFavorite ? 'secondary' : 'primary'}
            fullWidth
            onClick={() => setFavoriteTeam(topTeam.code)}
            disabled={alreadyFavorite}
            aria-pressed={alreadyFavorite}
          >
            {alreadyFavorite ? '推し国に登録済み' : 'この国を推しにする'}
          </Button>
          <Link
            href={`/countries/${topTeam.code}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text transition-colors hover:bg-pitch-50"
          >
            {topTeam.nameJa}をもっと知る
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <ShareButton
            text={shareText}
            title="推し国診断"
            label="結果をシェアする"
            fullWidth
          />
        </div>
      </Card>

      {/* ── 上位候補 ── */}
      {runnerUps.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-text">こんな国も合うかも</h3>
          <ul className="flex flex-col gap-2">
            {runnerUps.map((team) => (
              <li key={team.code}>
                <Link
                  href={`/countries/${team.code}`}
                  className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2 transition-colors hover:border-pitch-300 hover:bg-pitch-50"
                >
                  <CountryFlag
                    flagEmoji={team.flagEmoji}
                    nameJa={team.nameJa}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-text">
                      {team.nameJa}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {team.blurbJa}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-text-muted"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── やり直し ── */}
      <Button variant="ghost" onClick={onRetry} fullWidth>
        <RotateCcw className="h-4 w-4" aria-hidden />
        もう一度診断する
      </Button>
    </div>
  )
}
