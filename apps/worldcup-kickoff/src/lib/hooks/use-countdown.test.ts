import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from './use-countdown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('未来日時までの残り時間を算出する', async () => {
    const now = new Date('2026-06-01T00:00:00.000Z')
    vi.setSystemTime(now)
    // 1日2時間3分4秒後
    const target = new Date('2026-06-02T02:03:04.000Z')

    const { result } = renderHook(() => useCountdown(target.toISOString()))

    // マウント effect を流す
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.mounted).toBe(true)
    expect(result.current.days).toBe(1)
    expect(result.current.hours).toBe(2)
    expect(result.current.minutes).toBe(3)
    expect(result.current.seconds).toBe(4)
    expect(result.current.isComplete).toBe(false)
  })

  it('過去日時は全0かつ isComplete=true', async () => {
    vi.setSystemTime(new Date('2026-06-10T00:00:00.000Z'))
    const past = new Date('2026-06-01T00:00:00.000Z')

    const { result } = renderHook(() => useCountdown(past.toISOString()))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.days).toBe(0)
    expect(result.current.hours).toBe(0)
    expect(result.current.minutes).toBe(0)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isComplete).toBe(true)
  })

  it('1秒ごとに減っていく', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const target = new Date('2026-06-01T00:00:10.000Z')

    const { result } = renderHook(() => useCountdown(target.toISOString()))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.seconds).toBe(10)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(result.current.seconds).toBe(7)
  })
})
