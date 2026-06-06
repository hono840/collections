import { cn } from '@/lib/utils/cn'

export type CountryFlagSize = 'sm' | 'md' | 'lg' | 'xl'

export interface CountryFlagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'aria-label'> {
  /** 国旗絵文字（例: "🇯🇵"） */
  flagEmoji: string
  /** 日本語国名（aria-label・任意の visible ラベルに使用） */
  nameJa?: string
  /** サイズ */
  size?: CountryFlagSize
}

const sizeStyles: Record<CountryFlagSize, string> = {
  sm: 'text-xl leading-none',
  md: 'text-3xl leading-none',
  lg: 'text-5xl leading-none',
  xl: 'text-7xl leading-none',
}

/**
 * 国旗（絵文字）を大きめに表示する。
 * 絵文字は装飾だが国の識別情報のため、`nameJa` があれば aria-label に設定し
 * スクリーンリーダーに国名を読み上げさせる。emoji 自体は aria-hidden。
 */
export function CountryFlag({
  flagEmoji,
  nameJa,
  size = 'md',
  className,
  ...props
}: CountryFlagProps) {
  return (
    <span
      role={nameJa ? 'img' : undefined}
      aria-label={nameJa ?? undefined}
      className={cn('inline-flex select-none', sizeStyles[size], className)}
      {...props}
    >
      <span aria-hidden>{flagEmoji}</span>
    </span>
  )
}
