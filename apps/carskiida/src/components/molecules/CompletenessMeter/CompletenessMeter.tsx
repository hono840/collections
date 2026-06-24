import { cn } from '@/lib/utils/cn'

export interface CompletenessMeterProps {
  /** 0-100 */
  value: number
  className?: string
}

/**
 * データ充足度メーター（molecule）。
 * breadth/depth の作り込み度合いを可視化し、「無知を正直に見せる」誠実さを担保する。
 */
export function CompletenessMeter({ value, className }: CompletenessMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 w-24 overflow-hidden rounded-sm bg-ck-surface-sunken"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="データ充足度"
      >
        <div
          className="h-full bg-ck-accent"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="ck-num text-xs text-ck-text-muted">{clamped}%</span>
    </div>
  )
}
