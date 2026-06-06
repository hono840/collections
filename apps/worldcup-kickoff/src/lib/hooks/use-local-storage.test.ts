import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useLocalStorage } from './use-local-storage'

const schema = z.object({ count: z.number() })
type Value = z.infer<typeof schema>
const DEFAULT: Value = { count: 0 }
const KEY = 'wck:test-counter'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('初期値は defaultValue（hydration安全）', () => {
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    // 初回同期レンダーでは default
    expect(result.current.value).toEqual(DEFAULT)
  })

  it('マウント後に mounted=true になる', async () => {
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => {
      expect(result.current.mounted).toBe(true)
    })
  })

  it('保存済み有効データをマウント後に読み込む', async () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 42 }))
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => {
      expect(result.current.value).toEqual({ count: 42 })
    })
  })

  it('破損データは握り潰して default のまま', async () => {
    localStorage.setItem(KEY, '{broken')
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => {
      expect(result.current.mounted).toBe(true)
    })
    expect(result.current.value).toEqual(DEFAULT)
  })

  it('スキーマ不一致データも default のまま', async () => {
    localStorage.setItem(KEY, JSON.stringify({ wrong: 'shape' }))
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => {
      expect(result.current.mounted).toBe(true)
    })
    expect(result.current.value).toEqual(DEFAULT)
  })

  it('setValue で値を更新し localStorage に永続化する', async () => {
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => {
      result.current.setValue({ count: 7 })
    })
    expect(result.current.value).toEqual({ count: 7 })
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ count: 7 })
  })

  it('setValue は updater 関数を受け付ける', async () => {
    const { result } = renderHook(() =>
      useLocalStorage(KEY, schema, DEFAULT),
    )
    await waitFor(() => expect(result.current.mounted).toBe(true))

    act(() => {
      result.current.setValue((prev) => ({ count: prev.count + 1 }))
    })
    act(() => {
      result.current.setValue((prev) => ({ count: prev.count + 1 }))
    })
    expect(result.current.value).toEqual({ count: 2 })
  })
})
