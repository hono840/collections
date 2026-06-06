'use client'

/**
 * 推し国（favoriteTeam）を React Context として配布するプロバイダ。
 *
 * 推し国は複数の organisms（SiteHeader バッジ・国図鑑・診断結果）から参照されるため、
 * `use-favorite-team` フックを RootLayout 直下で 1 度だけ呼び、Context 経由で共有する。
 * これにより localStorage への重複アクセス・フック間の状態ずれを防ぐ。
 *
 * hydration 対策（mounted ガード）はフック側が担保するため、消費側は
 * `mounted` を見て未水和中のプレースホルダ表示を選べる。
 */
import { createContext, useContext, type ReactNode } from 'react'
import {
  useFavoriteTeam,
  type UseFavoriteTeamResult,
} from '@/lib/hooks/use-favorite-team'

const FavoriteTeamContext = createContext<UseFavoriteTeamResult | null>(null)

export function FavoriteTeamProvider({ children }: { children: ReactNode }) {
  const value = useFavoriteTeam()
  return (
    <FavoriteTeamContext.Provider value={value}>
      {children}
    </FavoriteTeamContext.Provider>
  )
}

/**
 * 推し国 Context を取得する。`FavoriteTeamProvider` 配下でのみ使用可能。
 */
export function useFavoriteTeamContext(): UseFavoriteTeamResult {
  const ctx = useContext(FavoriteTeamContext)
  if (ctx === null) {
    throw new Error(
      'useFavoriteTeamContext は FavoriteTeamProvider の内側で使用してください',
    )
  }
  return ctx
}
