'use client'

import { cn } from '@/lib/utils/cn'
import { usePredictions } from '@/lib/hooks/use-predictions'
import type { PredictionPick } from '@/lib/domain'

export interface PredictionButtonProps {
  /** 対象試合ID（予想の永続キー） */
  matchId: string
  /** ホーム側のラベル（既定: "ホーム勝ち"。国名を渡すと分かりやすい） */
  homeLabel?: string
  /** アウェイ側のラベル */
  awayLabel?: string
  /** 引き分けラベル */
  drawLabel?: string
  className?: string
}

interface Choice {
  pick: PredictionPick
  label: string
  /** 選択時の色クラス */
  activeClass: string
}

/**
 * 勝/分/敗の3択予想ボタン。`use-predictions` で matchId 単位に保存/取得し、
 * 同じ選択を再度押すと取り消す。各ボタンは `aria-pressed` を出力。
 * 未水和中（mounted=false）は全てニュートラル表示で hydration mismatch を避ける。
 * Client Component。
 */
export function PredictionButton({
  matchId,
  homeLabel = 'ホーム勝ち',
  awayLabel = 'アウェイ勝ち',
  drawLabel = '引き分け',
  className,
}: PredictionButtonProps) {
  const { getPick, setPick, mounted } = usePredictions()
  const current = mounted ? getPick(matchId) : null

  const choices: Choice[] = [
    {
      pick: 'home',
      label: homeLabel,
      activeClass: 'border-pitch-600 bg-pitch-600 text-white',
    },
    {
      pick: 'draw',
      label: drawLabel,
      activeClass: 'border-gold-500 bg-gold-400 text-gold-700',
    },
    {
      pick: 'away',
      label: awayLabel,
      activeClass: 'border-kickoff-500 bg-kickoff-500 text-white',
    },
  ]

  return (
    <div
      role="group"
      aria-label="勝敗予想"
      className={cn('grid grid-cols-3 gap-2', className)}
    >
      {choices.map((c) => {
        const isActive = current === c.pick
        return (
          <button
            key={c.pick}
            type="button"
            aria-pressed={isActive}
            onClick={() => setPick(matchId, c.pick)}
            className={cn(
              'inline-flex min-h-11 items-center justify-center rounded-xl border px-2 py-2 text-xs font-bold transition-colors',
              isActive
                ? c.activeClass
                : 'border-border bg-surface text-text-muted hover:border-pitch-300 hover:text-text',
            )}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
