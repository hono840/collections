import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize
  /** スクリーンリーダー向けラベル（既定: 読み込み中） */
  label?: string
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

/**
 * 読み込みスピナー。`role="status"` + 視覚非表示ラベルでアクセシブル。
 * Server Component（CSS アニメーションのみ）。
 */
export function Spinner({
  size = 'md',
  label = '読み込み中',
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex text-pitch-600', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizeStyles[size])} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}
