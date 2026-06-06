import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePredictions } from './use-predictions'
import { useFavoriteTeam } from './use-favorite-team'

beforeEach(() => {
  localStorage.clear()
})

describe('usePredictions', () => {
  it('予想を保存・取得できる', async () => {
    const { result } = renderHook(() => usePredictions())
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => {
      result.current.setPick('wc-001', 'home')
    })
    expect(result.current.getPick('wc-001')).toBe('home')
    expect(result.current.count).toBe(1)
  })

  it('同じ選択を再度押すと取り消す', async () => {
    const { result } = renderHook(() => usePredictions())
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => result.current.setPick('wc-001', 'draw'))
    act(() => result.current.setPick('wc-001', 'draw'))
    expect(result.current.getPick('wc-001')).toBeNull()
    expect(result.current.count).toBe(0)
  })

  it('clearAll で全削除', async () => {
    const { result } = renderHook(() => usePredictions())
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => result.current.setPick('wc-001', 'home'))
    act(() => result.current.setPick('wc-002', 'away'))
    expect(result.current.count).toBe(2)
    act(() => result.current.clearAll())
    expect(result.current.count).toBe(0)
  })

  it('リロード相当（再マウント）で保持される', async () => {
    const first = renderHook(() => usePredictions())
    await waitFor(() => expect(first.result.current.mounted).toBe(true))
    act(() => first.result.current.setPick('wc-010', 'away'))

    const second = renderHook(() => usePredictions())
    await waitFor(() => {
      expect(second.result.current.getPick('wc-010')).toBe('away')
    })
  })
})

describe('useFavoriteTeam', () => {
  it('推し国を設定・トグルできる', async () => {
    const { result } = renderHook(() => useFavoriteTeam())
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => result.current.setFavoriteTeam('JPN'))
    expect(result.current.favoriteTeam).toBe('JPN')
    expect(result.current.isFavorite('JPN')).toBe(true)

    act(() => result.current.toggleFavorite('JPN'))
    expect(result.current.favoriteTeam).toBeNull()

    act(() => result.current.toggleFavorite('BRA'))
    expect(result.current.favoriteTeam).toBe('BRA')
  })
})
