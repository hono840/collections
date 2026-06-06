'use client'

/**
 * 推し国（FIFA国コード）の永続フック。useLocalStorage の薄いラッパ。
 */
import { useCallback } from 'react'
import type { CountryCode } from '@/lib/domain'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { favoriteTeamSchema } from '@/lib/storage/schema'
import { useLocalStorage } from './use-local-storage'

export interface UseFavoriteTeamResult {
  /** 推し国コード。未設定は null */
  favoriteTeam: CountryCode | null
  setFavoriteTeam: (code: CountryCode) => void
  clearFavoriteTeam: () => void
  /** 指定コードが推し国かどうか */
  isFavorite: (code: CountryCode) => boolean
  /** クリックで推し国をトグル */
  toggleFavorite: (code: CountryCode) => void
  mounted: boolean
}

const DEFAULT: CountryCode | '' = ''

export function useFavoriteTeam(): UseFavoriteTeamResult {
  const { value, setValue, mounted } = useLocalStorage<string>(
    STORAGE_KEYS.favoriteTeam,
    favoriteTeamSchema,
    DEFAULT,
  )

  const favoriteTeam = value === '' ? null : value

  const setFavoriteTeam = useCallback(
    (code: CountryCode) => setValue(code),
    [setValue],
  )

  const clearFavoriteTeam = useCallback(() => setValue(''), [setValue])

  const isFavorite = useCallback(
    (code: CountryCode) => favoriteTeam === code,
    [favoriteTeam],
  )

  const toggleFavorite = useCallback(
    (code: CountryCode) => {
      setValue((prev) => (prev === code ? '' : code))
    },
    [setValue],
  )

  return {
    favoriteTeam,
    setFavoriteTeam,
    clearFavoriteTeam,
    isFavorite,
    toggleFavorite,
    mounted,
  }
}
