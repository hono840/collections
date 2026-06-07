'use client'

import { cn } from '@/lib/utils/cn'
import { favoritesStore, useFavorites } from '@/features/favorites/store'

export interface FavoriteButtonProps {
  /** "manufacturer:model" 形式 */
  favoriteRef: string
  className?: string
}

/**
 * お気に入りトグル（molecule / client）。
 */
export function FavoriteButton({ favoriteRef, className }: FavoriteButtonProps) {
  const list = useFavorites()
  const saved = list.includes(favoriteRef)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    favoritesStore.toggle(favoriteRef)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'お気に入りから外す' : 'お気に入りに追加'}
      title={saved ? 'お気に入り済み' : 'お気に入りに追加'}
      className={cn(
        'ck-num rounded-sm border px-2 py-1 text-xs transition-colors',
        saved
          ? 'border-ck-mark bg-ck-mark/10 text-ck-mark'
          : 'border-ck-border text-ck-text-muted hover:border-ck-mark hover:text-ck-mark',
        className
      )}
    >
      {saved ? '★ 保存済み' : '☆ 保存'}
    </button>
  )
}
