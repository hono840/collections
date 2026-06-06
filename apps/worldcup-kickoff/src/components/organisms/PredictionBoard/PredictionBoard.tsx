'use client'

import { useMemo, useState } from 'react'
import { Lock, Trophy } from 'lucide-react'
import { MatchCard } from '@/components/molecules/MatchCard'
import { PredictionButton } from '@/components/molecules/PredictionButton'
import { FilterTabs } from '@/components/molecules/FilterTabs'
import { ProgressBar } from '@/components/atoms/ProgressBar'
import { Card } from '@/components/atoms/Card'
import { EmptyState } from '@/components/atoms/EmptyState'
import { usePredictions } from '@/lib/hooks/use-predictions'
import { cn } from '@/lib/utils/cn'

/** 試合一覧フィルタの値 */
type StageFilter = 'all' | 'group' | 'knockout'

const STAGE_OPTIONS: ReadonlyArray<{ value: StageFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'group', label: 'グループ' },
  { value: 'knockout', label: '決勝T' },
]

/**
 * Server Component が用意する、予想ボード用のシリアライズ可能な試合ビュー。
 * Match/Team ドメイン型から表示に必要な値だけを抽出した DTO。
 */
export interface PredictionMatchView {
  matchId: string
  /** グループステージ or 決勝トーナメント */
  phase: 'group' | 'knockout'
  /** ホーム（確定時のみ。未確定枠は null） */
  home: { flagEmoji: string; nameJa: string } | null
  away: { flagEmoji: string; nameJa: string } | null
  homePlaceholder?: string
  awayPlaceholder?: string
  kickoffUtc: string
  stadiumName: string | null
  roundLabelJa: string
  /** 両チーム確定済みで予想可能か（決勝Tの未確定枠は false） */
  predictable: boolean
}

export interface PredictionBoardProps {
  matches: PredictionMatchView[]
  className?: string
}

/**
 * 勝敗予想ボード。全試合を一覧し、確定カードに PredictionButton を付ける。
 * 上部に「◯/全件 予想済み」進捗を表示。決勝Tの未確定カードは予想対象外（プレースホルダ表示のみ）。
 * 予想の永続化は PredictionButton 内の use-predictions が担う。
 * Client Component（フィルタ状態・予想件数を保持）。
 */
export function PredictionBoard({ matches, className }: PredictionBoardProps) {
  const [filter, setFilter] = useState<StageFilter>('all')
  const { count, mounted } = usePredictions()

  // 予想可能な試合数（決勝Tの未確定枠を除く）を分母にする
  const total = useMemo(
    () => matches.filter((m) => m.predictable).length,
    [matches],
  )

  const visible = useMemo(() => {
    if (filter === 'all') return matches
    return matches.filter((m) => m.phase === filter)
  }, [matches, filter])

  // 進捗（未水和中は 0 表示で hydration mismatch を避ける）
  const predictedCount = mounted ? count : 0

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* 進捗サマリ */}
      <Card padding="md" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-text">
            <Trophy className="h-4 w-4 shrink-0 text-gold-500" aria-hidden />
            予想の進み具合
          </span>
          <span className="text-sm font-bold tabular-nums text-pitch-700">
            {predictedCount}
            <span className="text-text-muted">/{total} 試合</span>
          </span>
        </div>
        <ProgressBar
          value={predictedCount}
          max={total}
          color="pitch"
          label={`${total}試合中${predictedCount}試合を予想済み`}
        />
        {/* 結果未確定のため的中率はプレースホルダ */}
        <p className="text-xs text-text-muted">
          的中率は結果が出たら表示されます。
        </p>
      </Card>

      {/* フィルタ */}
      <FilterTabs
        options={STAGE_OPTIONS}
        value={filter}
        onChange={setFilter}
        ariaLabel="試合の絞り込み"
      />

      {/* 試合一覧 */}
      {visible.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <li key={m.matchId}>
              <MatchCard
                home={m.home}
                away={m.away}
                homePlaceholder={m.homePlaceholder}
                awayPlaceholder={m.awayPlaceholder}
                kickoffUtc={m.kickoffUtc}
                stadiumName={m.stadiumName}
                roundLabelJa={m.roundLabelJa}
              >
                {m.predictable ? (
                  <PredictionButton
                    matchId={m.matchId}
                    homeLabel={m.home?.nameJa ?? 'ホーム'}
                    awayLabel={m.away?.nameJa ?? 'アウェイ'}
                  />
                ) : (
                  <p className="flex items-center justify-center gap-1.5 rounded-xl bg-bg py-2 text-xs font-medium text-text-muted">
                    <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    対戦カードが決まると予想できます
                  </p>
                )}
              </MatchCard>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="表示できる試合がありません"
          description="フィルタを変えてみてください。"
        />
      )}
    </div>
  )
}
