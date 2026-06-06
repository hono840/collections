import { cn } from '@/lib/utils/cn'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 内側パディング */
  padding?: CardPadding
  /** タップ可能な見た目（hover で持ち上がる） */
  interactive?: boolean
  /** ゴールド枠で強調（推し・注目カード） */
  highlighted?: boolean
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

/**
 * 汎用カード。rounded-2xl + 細ボーダー + 微シャドウのデザイン言語の基礎パーツ。
 * Server Component（表示のみ）。
 */
export function Card({
  padding = 'md',
  interactive = false,
  highlighted = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface shadow-sm',
        highlighted ? 'border-gold-400 ring-1 ring-gold-200' : 'border-border',
        interactive &&
          'transition-shadow hover:shadow-md focus-within:shadow-md',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
