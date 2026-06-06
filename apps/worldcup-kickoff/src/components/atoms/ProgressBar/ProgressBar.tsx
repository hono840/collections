import { cn } from '@/lib/utils/cn'

export type ProgressBarColor = 'pitch' | 'gold' | 'kickoff'

export interface ProgressBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** 現在値 */
  value: number
  /** 最大値（既定 100） */
  max?: number
  /** バーの色 */
  color?: ProgressBarColor
  /** スクリーンリーダー向けラベル */
  label?: string
}

const fillStyles: Record<ProgressBarColor, string> = {
  pitch: 'bg-pitch-600',
  gold: 'bg-gold-400',
  kickoff: 'bg-kickoff-500',
}

/**
 * 進捗バー（学習進捗・診断進行など）。
 * `role="progressbar"` + aria 値で進捗をアクセシブルに通知する。Server Component。
 */
export function ProgressBar({
  value,
  max = 100,
  color = 'pitch',
  label,
  className,
  ...props
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const percent = Math.round((clamped / safeMax) * 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-border',
        className,
      )}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all', fillStyles[color])}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
