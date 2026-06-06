'use client'

/**
 * 勝敗予想の永続フック。useLocalStorage の薄いラッパ。
 */
import { useCallback } from 'react'
import type { PredictionPick, PredictionStore } from '@/lib/domain'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { predictionStoreSchema } from '@/lib/storage/schema'
import { useLocalStorage } from './use-local-storage'

const DEFAULT: PredictionStore = {
  version: 1,
  picks: {},
  updatedAt: '',
}

export interface UsePredictionsResult {
  predictions: PredictionStore
  /** 指定試合の予想を取得（無ければ null） */
  getPick: (matchId: string) => PredictionPick | null
  /** 予想を保存（同じ選択を再度押すと取り消し） */
  setPick: (matchId: string, pick: PredictionPick) => void
  /** 指定試合の予想を削除 */
  clearPick: (matchId: string) => void
  /** 全予想をリセット */
  clearAll: () => void
  /** 予想済み件数 */
  count: number
  mounted: boolean
}

export function usePredictions(): UsePredictionsResult {
  const { value, setValue, mounted } = useLocalStorage<PredictionStore>(
    STORAGE_KEYS.predictions,
    predictionStoreSchema,
    DEFAULT,
  )

  const getPick = useCallback(
    (matchId: string): PredictionPick | null => value.picks[matchId] ?? null,
    [value.picks],
  )

  const setPick = useCallback(
    (matchId: string, pick: PredictionPick) => {
      setValue((prev) => {
        const nextPicks = { ...prev.picks }
        if (nextPicks[matchId] === pick) {
          // 同じ選択を再度 → 取り消し
          delete nextPicks[matchId]
        } else {
          nextPicks[matchId] = pick
        }
        return {
          version: 1,
          picks: nextPicks,
          updatedAt: new Date().toISOString(),
        }
      })
    },
    [setValue],
  )

  const clearPick = useCallback(
    (matchId: string) => {
      setValue((prev) => {
        const nextPicks = { ...prev.picks }
        delete nextPicks[matchId]
        return {
          version: 1,
          picks: nextPicks,
          updatedAt: new Date().toISOString(),
        }
      })
    },
    [setValue],
  )

  const clearAll = useCallback(() => {
    setValue({ version: 1, picks: {}, updatedAt: new Date().toISOString() })
  }, [setValue])

  return {
    predictions: value,
    getPick,
    setPick,
    clearPick,
    clearAll,
    count: Object.keys(value.picks).length,
    mounted,
  }
}
