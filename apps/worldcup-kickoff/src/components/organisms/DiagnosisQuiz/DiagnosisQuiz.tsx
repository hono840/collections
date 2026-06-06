'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProgressBar } from '@/components/atoms/ProgressBar'
import { Button } from '@/components/atoms/Button'
import { QuizOption } from '@/components/molecules/QuizOption'
import { DiagnosisResultCard } from '@/components/organisms/DiagnosisResultCard'
import { DIAGNOSIS_QUESTIONS } from '@/lib/diagnosis/questions'
import {
  scoreTeams,
  type DiagnosisAnswers,
} from '@/lib/diagnosis/scoring'
import { useDiagnosisResult } from '@/lib/hooks/use-diagnosis-result'
import { cn } from '@/lib/utils/cn'
import type { CountryCode, Team } from '@/lib/domain'

/** 上位候補として保持・表示する件数（第1候補込み） */
const RANKING_LIMIT = 4

export interface DiagnosisQuizProps {
  /** スコアリングに必要な全チーム（Server の page で取得して渡す） */
  teams: Team[]
  className?: string
}

interface QuizState {
  /** 現在の設問インデックス */
  current: number
  /** questionId → optionId */
  answers: DiagnosisAnswers
}

type QuizAction =
  | { type: 'select'; questionId: string; optionId: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' }

const INITIAL_STATE: QuizState = { current: 0, answers: {} }

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'select':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.optionId },
      }
    case 'next':
      return {
        ...state,
        current: Math.min(state.current + 1, DIAGNOSIS_QUESTIONS.length),
      }
    case 'back':
      return { ...state, current: Math.max(state.current - 1, 0) }
    case 'reset':
      return INITIAL_STATE
  }
}

/**
 * 推し国診断の進行 organism。設問を1問ずつ進め、最後の回答後にスコアリングして
 * 結果を localStorage に保存・表示する。再訪時は保存済み結果を直接表示する。
 *
 * - 状態は useReducer でローカル管理（current + answers）。
 * - キーボード操作: 各 QuizOption は button なので Tab/Enter で選択可、
 *   左右矢印で前後の設問へ移動できる。
 * - teams は Server（page）で取得し props で受け取る（scoring に必要な属性込み）。
 * Client Component。
 */
export function DiagnosisQuiz({ teams, className }: DiagnosisQuizProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const { result, saveResult, clearResult, hasResult, mounted } =
    useDiagnosisResult()

  const total = DIAGNOSIS_QUESTIONS.length
  const isLast = state.current === total - 1
  const question = DIAGNOSIS_QUESTIONS[state.current]
  const selectedOptionId = question ? state.answers[question.id] : undefined
  const answeredCount = Object.keys(state.answers).length

  // teamByCode を一度だけ構築（結果カードで Team を解決するため）
  const teamByCode = useMemo<Map<CountryCode, Team>>(
    () => new Map(teams.map((t) => [t.code, t])),
    [teams],
  )

  // 完了処理（最後の設問で回答 → スコアリング → 保存）
  const finish = useCallback(
    (answers: DiagnosisAnswers) => {
      const ranking = scoreTeams(answers, teams)
        .slice(0, RANKING_LIMIT)
        .map((s) => s.code)
      if (ranking.length === 0) return
      saveResult({ topTeamCode: ranking[0], ranking, answers })
    },
    [teams, saveResult],
  )

  const handleSelect = useCallback(
    (optionId: string) => {
      if (!question) return
      const nextAnswers = { ...state.answers, [question.id]: optionId }
      dispatch({ type: 'select', questionId: question.id, optionId })
      if (isLast) {
        finish(nextAnswers)
      } else {
        dispatch({ type: 'next' })
      }
    },
    [question, state.answers, isLast, finish],
  )

  const handleRetry = useCallback(() => {
    clearResult()
    dispatch({ type: 'reset' })
  }, [clearResult])

  // 左右矢印で設問移動（回答済みのみ前進可）。
  // ただし入力系・ボタン・role="button"（QuizOption 等）にフォーカスがある間や
  // SR のブラウズ操作では発火させない（意図しない設問移動・読み上げ妨害を防ぐ）。
  useEffect(() => {
    if (hasResult) return
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'input,textarea,select,[contenteditable],button,[role="button"]',
        )
      ) {
        return
      }
      if (e.key === 'ArrowLeft') {
        dispatch({ type: 'back' })
      } else if (e.key === 'ArrowRight') {
        if (selectedOptionId && !isLast) dispatch({ type: 'next' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasResult, selectedOptionId, isLast])

  // ── 未水和中はプレースホルダ（hydration mismatch 回避）──
  if (!mounted) {
    return (
      <div className={cn('flex flex-col gap-4', className)} aria-busy>
        <ProgressBar value={0} max={total} label="診断を読み込み中" />
        <p className="text-center text-sm text-text-muted">読み込み中…</p>
      </div>
    )
  }

  // ── 保存済み結果があれば結果を表示 ──
  if (hasResult && result) {
    const topTeam = teamByCode.get(result.topTeamCode) ?? null
    const runnerUps = result.ranking
      .slice(1)
      .map((code) => teamByCode.get(code))
      .filter((t): t is Team => t != null)
    return (
      <DiagnosisResultCard
        topTeam={topTeam}
        runnerUps={runnerUps}
        onRetry={handleRetry}
        className={className}
      />
    )
  }

  if (!question) return null

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* 進捗 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-text-muted">
          <span>
            質問 {state.current + 1} / {total}
          </span>
          <span>{answeredCount}問 回答済み</span>
        </div>
        <ProgressBar
          value={state.current + 1}
          max={total}
          color="pitch"
          label={`診断の進捗 ${state.current + 1} / ${total}`}
        />
      </div>

      {/* 設問 */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-xl font-extrabold text-text">
          {question.question}
        </legend>
        <div
          role="group"
          aria-label={question.question}
          className="flex flex-col gap-2.5"
        >
          {question.options.map((option) => {
            const selected = selectedOptionId === option.id
            return (
              <QuizOption
                key={option.id}
                label={option.label}
                selected={selected}
                onClick={() => handleSelect(option.id)}
              />
            )
          })}
        </div>
      </fieldset>

      {/* ナビ（戻る / 次へ）。次へは回答済みのときのみ活性 */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: 'back' })}
          disabled={state.current === 0}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          戻る
        </Button>
        {!isLast ? (
          <Button
            variant="secondary"
            onClick={() => dispatch({ type: 'next' })}
            disabled={!selectedOptionId}
          >
            次へ
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <span className="text-xs text-text-muted">
            選ぶと結果が出ます
          </span>
        )}
      </div>
    </div>
  )
}
