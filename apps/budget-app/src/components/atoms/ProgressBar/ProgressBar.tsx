import { cn } from '@/lib/utils/cn'

export type ProgressBarColor = 'emerald' | 'amber' | 'red' | 'brand' | 'slate'

export interface ProgressBarProps {
  /** 進捗パーセンテージ (0-100+) */
  percentage: number
  /** プログレスバーの色 */
  color?: ProgressBarColor
  /** 背景の色 */
  bgColor?: string
  className?: string
}

const barColors: Record<ProgressBarColor, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  brand: 'bg-brand-500',
  slate: 'bg-slate-300 dark:bg-zinc-600',
}

export function ProgressBar({
  percentage,
  color = 'brand',
  bgColor,
  className,
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        'h-2 overflow-hidden rounded-full',
        bgColor ?? 'bg-slate-100 dark:bg-zinc-800',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          barColors[color]
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}
