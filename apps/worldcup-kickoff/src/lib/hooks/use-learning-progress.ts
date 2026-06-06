'use client'

/**
 * 学習進捗（閲覧済みレッスン・用語）の永続フック。useLocalStorage の薄いラッパ。
 */
import { useCallback } from 'react'
import type { LearningProgress } from '@/lib/domain'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { learningProgressSchema } from '@/lib/storage/schema'
import { useLocalStorage } from './use-local-storage'

const DEFAULT: LearningProgress = {
  version: 1,
  readRuleSlugs: [],
  seenTermSlugs: [],
}

export interface UseLearningProgressResult {
  progress: LearningProgress
  markRuleRead: (slug: string) => void
  markTermSeen: (slug: string) => void
  isRuleRead: (slug: string) => boolean
  isTermSeen: (slug: string) => boolean
  /** 閲覧済みレッスン数 */
  readRuleCount: number
  reset: () => void
  mounted: boolean
}

/** 配列に値を追加（重複なし） */
function addUnique(list: string[], slug: string): string[] {
  return list.includes(slug) ? list : [...list, slug]
}

export function useLearningProgress(): UseLearningProgressResult {
  const { value, setValue, mounted } = useLocalStorage<LearningProgress>(
    STORAGE_KEYS.learningProgress,
    learningProgressSchema,
    DEFAULT,
  )

  const markRuleRead = useCallback(
    (slug: string) => {
      setValue((prev) => ({
        ...prev,
        version: 1,
        readRuleSlugs: addUnique(prev.readRuleSlugs, slug),
      }))
    },
    [setValue],
  )

  const markTermSeen = useCallback(
    (slug: string) => {
      setValue((prev) => ({
        ...prev,
        version: 1,
        seenTermSlugs: addUnique(prev.seenTermSlugs, slug),
      }))
    },
    [setValue],
  )

  const isRuleRead = useCallback(
    (slug: string) => value.readRuleSlugs.includes(slug),
    [value.readRuleSlugs],
  )

  const isTermSeen = useCallback(
    (slug: string) => value.seenTermSlugs.includes(slug),
    [value.seenTermSlugs],
  )

  const reset = useCallback(() => setValue(DEFAULT), [setValue])

  return {
    progress: value,
    markRuleRead,
    markTermSeen,
    isRuleRead,
    isTermSeen,
    readRuleCount: value.readRuleSlugs.length,
    reset,
    mounted,
  }
}
