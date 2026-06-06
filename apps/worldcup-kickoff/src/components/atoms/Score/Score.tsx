import { cn } from '@/lib/utils/cn'

export type ScoreSize = 'sm' | 'md' | 'lg'

export interface ScoreProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** ホーム得点。未実施は null/undefined */
  home?: number | null
  /** アウェイ得点。未実施は null/undefined */
  away?: number | null
  size?: ScoreSize
}

const sizeStyles: Record<ScoreSize, string> = {
  sm: 'text-sm gap-1.5',
  md: 'text-xl gap-2',
  lg: 'text-3xl gap-3',
}

/**
 * 試合スコア表示。両得点が確定していれば「2 - 1」、未実施は「- vs -」相当の
 * プレースホルダ（"-"）を中央のセパレータと共に表示する。Server Component。
 */
export function Score({
  home,
  away,
  size = 'md',
  className,
  ...props
}: ScoreProps) {
  const hasScore =
    typeof home === 'number' && typeof away === 'number'
  const homeText = hasScore ? String(home) : '-'
  const awayText = hasScore ? String(away) : '-'
  const label = hasScore ? `${home} 対 ${away}` : '試合前'

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-flex items-center font-extrabold tabular-nums',
        hasScore ? 'text-text' : 'text-text-muted',
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      <span>{homeText}</span>
      <span aria-hidden className="font-normal text-text-muted">
        -
      </span>
      <span>{awayText}</span>
    </span>
  )
}
