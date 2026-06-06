'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useFavoriteTeamContext } from '@/components/providers/FavoriteTeamProvider'
import type { CountryCode } from '@/lib/domain'

export type FavoriteToggleSize = 'sm' | 'md' | 'lg'

export interface FavoriteToggleProps {
  /** 対象国コード */
  teamCode: CountryCode
  /** 国名（aria-label の文脈に使用） */
  nameJa?: string
  size?: FavoriteToggleSize
  /** ラベルテキストを併記する（ボタン形）。false ならアイコンのみ */
  showLabel?: boolean
  className?: string
}

const iconSize: Record<FavoriteToggleSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

/**
 * 推し国の星トグル。`FavoriteTeamProvider` の Context を介して localStorage に保存。
 * 推し国は1ヶ国のみ（別の国を推すと付け替わる）。`aria-pressed` で状態を通知し、
 * 未水和中はニュートラル表示にして hydration mismatch を避ける。Client Component。
 */
export function FavoriteToggle({
  teamCode,
  nameJa,
  size = 'md',
  showLabel = false,
  className,
}: FavoriteToggleProps) {
  const { isFavorite, toggleFavorite, mounted } = useFavoriteTeamContext()
  const active = mounted && isFavorite(teamCode)

  const target = nameJa ? `${nameJa}を` : ''
  const label = active ? `${target}推し国から外す` : `${target}推し国にする`

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={() => toggleFavorite(teamCode)}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold transition-colors',
        active
          ? 'border-gold-400 bg-gold-100 text-gold-700'
          : 'border-border bg-surface text-text-muted hover:border-gold-300 hover:text-gold-600',
        !showLabel && 'min-w-11 px-0',
        className,
      )}
    >
      <Star
        className={cn(iconSize[size], active && 'fill-gold-400')}
        aria-hidden
      />
      {showLabel ? <span>{active ? '推し国' : '推す'}</span> : null}
    </button>
  )
}
