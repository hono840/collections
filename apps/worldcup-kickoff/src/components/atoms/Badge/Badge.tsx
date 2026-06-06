import { cn } from '@/lib/utils/cn'

export type BadgeVariant =
  | 'pitch'
  | 'gold'
  | 'kickoff'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 色バリアント */
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  pitch: 'bg-pitch-100 text-pitch-800',
  gold: 'bg-gold-100 text-gold-700',
  kickoff: 'bg-kickoff-100 text-kickoff-700',
  neutral: 'bg-border text-text-muted',
  success: 'bg-pitch-100 text-pitch-800',
  warning: 'bg-gold-100 text-gold-700',
  danger: 'bg-kickoff-100 text-kickoff-700',
}

/**
 * ステータス・分類を示す小さなラベル。Server Component（表示のみ）。
 */
export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
