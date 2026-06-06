'use client'

import { cn } from '@/lib/utils/cn'
import { useCountdown } from '@/lib/hooks/use-countdown'
import { KICKOFF_DATE } from '@/lib/constants/tournament'

export type CountdownTimerSize = 'sm' | 'md' | 'lg'

export interface CountdownTimerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** カウントダウンの目標日時（既定: 開幕日時）。ISO/Date/epoch ms */
  target?: string | number | Date
  /** サイズ */
  size?: CountdownTimerSize
  /** 開幕後（target 経過後）に表示する文言 */
  completeLabel?: string
  /** 単位ラベルを隠してコンパクト表示（SiteHeader 用） */
  compact?: boolean
}

interface Unit {
  value: number
  label: string
  /** コンパクト時の短縮ラベル */
  short: string
}

const sizeStyles: Record<CountdownTimerSize, { num: string; label: string; gap: string }> = {
  sm: { num: 'text-base', label: 'text-[10px]', gap: 'gap-1.5' },
  md: { num: 'text-2xl', label: 'text-xs', gap: 'gap-3' },
  lg: { num: 'text-4xl', label: 'text-sm', gap: 'gap-4' },
}

/**
 * 開幕（または任意の目標日時）までのカウントダウン。
 * SSR / 未水和中は静的初期値（全0）を表示し、マウント後に駆動する（hydration 安全）。
 * Client Component（use-countdown 使用）。
 */
export function CountdownTimer({
  target = KICKOFF_DATE,
  size = 'md',
  completeLabel = '開幕しました',
  compact = false,
  className,
  ...props
}: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isComplete, mounted } =
    useCountdown(target)

  if (mounted && isComplete) {
    return (
      <div
        className={cn('font-bold text-pitch-700', sizeStyles[size].num, className)}
        {...props}
      >
        {completeLabel}
      </div>
    )
  }

  const units: Unit[] = [
    { value: days, label: '日', short: '日' },
    { value: hours, label: '時間', short: '時' },
    { value: minutes, label: '分', short: '分' },
    { value: seconds, label: '秒', short: '秒' },
  ]

  // スクリーンリーダー向けの読み上げテキスト（未水和中は曖昧さを避け非表示）
  const srLabel = mounted
    ? `開幕まであと ${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`
    : undefined

  const s = sizeStyles[size]

  if (compact) {
    return (
      <div
        className={cn('inline-flex items-baseline gap-0.5 tabular-nums', className)}
        aria-label={srLabel}
        {...props}
      >
        {units.map((u, i) => (
          <span key={u.label} className="inline-flex items-baseline">
            <span className={cn('font-bold text-pitch-700', s.num)} aria-hidden>
              {String(u.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-text-muted" aria-hidden>
              {u.short}
            </span>
            {i < units.length - 1 ? (
              <span className="px-0.5 text-text-muted" aria-hidden>
                {' '}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-end', s.gap, className)}
      aria-label={srLabel}
      {...props}
    >
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center" aria-hidden>
          <span className={cn('font-extrabold tabular-nums text-pitch-700', s.num)}>
            {String(u.value).padStart(2, '0')}
          </span>
          <span className={cn('font-medium text-text-muted', s.label)}>
            {u.label}
          </span>
        </div>
      ))}
    </div>
  )
}
