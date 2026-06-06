'use client'

/**
 * 推し国診断結果の永続フック。useLocalStorage の薄いラッパ。
 */
import { useCallback } from 'react'
import type { DiagnosisResult } from '@/lib/domain'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { diagnosisResultSchema } from '@/lib/storage/schema'
import { useLocalStorage } from './use-local-storage'

// 空の初期値（version は型整合のため 1 固定。未診断は hasResult=false で判定）
const DEFAULT: DiagnosisResult = {
  version: 1,
  topTeamCode: '',
  ranking: [],
  answers: {},
  completedAt: '',
}

export interface UseDiagnosisResultResult {
  /** 診断結果。未診断は null */
  result: DiagnosisResult | null
  /** 診断結果を保存 */
  saveResult: (result: Omit<DiagnosisResult, 'version' | 'completedAt'>) => void
  /** 診断結果をクリア（再診断） */
  clearResult: () => void
  /** 診断済みか */
  hasResult: boolean
  mounted: boolean
}

export function useDiagnosisResult(): UseDiagnosisResultResult {
  const { value, setValue, mounted } = useLocalStorage<DiagnosisResult>(
    STORAGE_KEYS.diagnosisResult,
    diagnosisResultSchema,
    DEFAULT,
  )

  const hasResult = value.completedAt !== '' && value.topTeamCode !== ''

  const saveResult = useCallback(
    (input: Omit<DiagnosisResult, 'version' | 'completedAt'>) => {
      setValue({
        version: 1,
        topTeamCode: input.topTeamCode,
        ranking: input.ranking,
        answers: input.answers,
        completedAt: new Date().toISOString(),
      })
    },
    [setValue],
  )

  const clearResult = useCallback(() => {
    setValue(DEFAULT)
  }, [setValue])

  return {
    result: hasResult ? value : null,
    saveResult,
    clearResult,
    hasResult,
    mounted,
  }
}
