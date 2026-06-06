'use client'

/**
 * 目標日時までのカウントダウンフック。
 *
 * - SSR / 初回レンダーは mounted=false の静的初期値（全0）。hydration mismatch を避ける。
 * - マウント後に setInterval（1秒）で駆動し、mounted=true の実値に切り替わる。
 * - 目標を過ぎたら全て 0 + isComplete=true。
 */
import { useEffect, useState } from 'react'

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  /** 目標日時を過ぎたか */
  isComplete: boolean
  /** クライアントで駆動開始済みか（hydration ガード用） */
  mounted: boolean
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const INITIAL: Countdown = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isComplete: false,
  mounted: false,
}

function compute(targetMs: number, nowMs: number): Countdown {
  const remaining = targetMs - nowMs
  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
      mounted: true,
    }
  }
  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    isComplete: false,
    mounted: true,
  }
}

/**
 * @param target 目標日時（ISO文字列 or Date or epoch ms）
 */
export function useCountdown(target: string | number | Date): Countdown {
  const [state, setState] = useState<Countdown>(INITIAL)

  // target を依存に含め、target 変更時に再計算する。
  // target が Date インスタンスのときは ISO 文字列に正規化して安定参照にする。
  const targetKey =
    target instanceof Date ? target.toISOString() : String(target)

  useEffect(() => {
    const targetMs = new Date(targetKey).getTime()
    const tick = () => setState(compute(targetMs, Date.now()))
    tick()
    const id = setInterval(tick, SECOND)
    return () => clearInterval(id)
  }, [targetKey])

  return state
}
