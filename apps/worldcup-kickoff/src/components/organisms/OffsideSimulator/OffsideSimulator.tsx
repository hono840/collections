'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Flag, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * 攻撃側選手の位置（ピッチ幅に対する 0〜100 のパーセント）。
 * 値が大きいほど相手ゴール（右）に近い。
 */
const MIN_POS = 6
const MAX_POS = 94
const STEP = 4
const INITIAL_ATTACKER = 50
/** 最終DFライン（守備側の最後尾＝GKを除く2人目）の位置。固定の基準線。 */
const DEFENDER_LINE = 64

export interface OffsideSimulatorProps {
  className?: string
}

/**
 * オフサイド体験シミュレーター。
 * 攻撃側選手をピッチ上で左右にドラッグ（Pointer Events）し、最終DFラインとの
 * 位置関係でオフサイド/オンサイドをリアルタイム判定する。
 *
 * A11y:
 * - ドラッグできないユーザー向けに ←/→ ボタンの代替操作を併設。
 * - 判定結果は aria-live="polite" でスクリーンリーダーに通知。
 * - 選手ハンドルは role="slider" + aria 値で操作可能（矢印キー対応）。
 * Client Component。
 */
export function OffsideSimulator({ className }: OffsideSimulatorProps) {
  const [attackerPos, setAttackerPos] = useState(INITIAL_ATTACKER)
  const trackRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const id = useId()
  const resultId = `offside-result-${id}`

  // 攻撃側がDFラインより相手ゴール側（右）にいる＝オフサイドポジション
  const isOffside = attackerPos > DEFENDER_LINE

  const clamp = useCallback(
    (value: number) => Math.min(MAX_POS, Math.max(MIN_POS, value)),
    [],
  )

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      if (rect.width === 0) return
      const ratio = ((clientX - rect.left) / rect.width) * 100
      setAttackerPos(clamp(Math.round(ratio)))
    },
    [clamp],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true
      handleRef.current?.setPointerCapture(e.pointerId)
      setFromClientX(e.clientX)
    },
    [setFromClientX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      setFromClientX(e.clientX)
    },
    [setFromClientX],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false
      if (handleRef.current?.hasPointerCapture(e.pointerId)) {
        handleRef.current.releasePointerCapture(e.pointerId)
      }
    },
    [],
  )

  const moveBy = useCallback(
    (delta: number) => setAttackerPos((p) => clamp(p + delta)),
    [clamp],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        moveBy(-STEP)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        moveBy(STEP)
      }
    },
    [moveBy],
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* ピッチ */}
      <div
        ref={trackRef}
        className="relative h-44 w-full touch-none overflow-hidden rounded-2xl border border-pitch-200 bg-pitch-50 select-none"
      >
        {/* 中央ライン（装飾） */}
        <div
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-pitch-200"
          aria-hidden
        />
        {/* 相手ゴール（右端） */}
        <div
          className="absolute inset-y-6 right-1 w-1.5 rounded bg-pitch-300"
          aria-hidden
        />

        {/* 最終DFライン */}
        <div
          className="absolute inset-y-0 w-0.5 bg-kickoff-500"
          style={{ left: `${DEFENDER_LINE}%` }}
          aria-hidden
        >
          <span className="absolute -top-0 left-1 whitespace-nowrap rounded bg-kickoff-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            最終DFライン
          </span>
        </div>
        {/* DF選手アイコン（ライン上） */}
        <div
          className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-kickoff-500 bg-surface text-xs font-bold text-kickoff-600"
          style={{ left: `${DEFENDER_LINE}%` }}
          aria-hidden
        >
          DF
        </div>

        {/* 攻撃側選手（ドラッグ可能ハンドル） */}
        <div
          ref={handleRef}
          role="slider"
          tabIndex={0}
          aria-label="攻撃側の選手の位置"
          aria-valuemin={MIN_POS}
          aria-valuemax={MAX_POS}
          aria-valuenow={Math.round(attackerPos)}
          aria-valuetext={`${isOffside ? 'オフサイドの位置' : 'オンサイドの位置'}`}
          aria-describedby={resultId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-colors active:cursor-grabbing',
            isOffside
              ? 'border-kickoff-600 bg-kickoff-500 text-white'
              : 'border-pitch-600 bg-pitch-500 text-white',
          )}
          style={{ left: `${attackerPos}%` }}
        >
          FW
        </div>
      </div>

      {/* 判定結果（aria-live） */}
      <div
        id={resultId}
        aria-live="polite"
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold',
          isOffside
            ? 'bg-kickoff-50 text-kickoff-700'
            : 'bg-pitch-50 text-pitch-700',
        )}
      >
        <Flag className="h-4 w-4 shrink-0" aria-hidden />
        {isOffside
          ? 'オフサイド！ 攻撃側がDFラインより前に出ています'
          : 'オンサイド。攻撃側はDFラインより手前にいます'}
      </div>

      {/* ドラッグ不可ユーザー向けの代替操作 */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => moveBy(-STEP)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:border-pitch-300 hover:text-text"
          aria-label="攻撃側を左（自陣側）へ動かす"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setAttackerPos(INITIAL_ATTACKER)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-text-muted transition-colors hover:border-pitch-300 hover:text-text"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          リセット
        </button>
        <button
          type="button"
          onClick={() => moveBy(STEP)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:border-pitch-300 hover:text-text"
          aria-label="攻撃側を右（相手ゴール側）へ動かす"
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <p className="text-center text-xs text-text-muted">
        FW（緑）をドラッグするか ←/→
        ボタンで動かして、赤い「最終DFライン」との位置でオフサイドを体験しよう。
      </p>
    </div>
  )
}
