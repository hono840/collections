import { describe, it, expect, beforeEach } from 'vitest'
import { safeStorage, getItem, setItem, removeItem } from './safe-storage'
import { predictionStoreSchema, favoriteTeamSchema } from './schema'

beforeEach(() => {
  localStorage.clear()
})

describe('safe-storage', () => {
  it('保存した値を検証付きで取得できる', () => {
    const store = {
      version: 1 as const,
      picks: { 'wc-001': 'home' as const },
      updatedAt: '2026-06-01T00:00:00.000Z',
    }
    setItem('wck:predictions', store)
    expect(getItem('wck:predictions', predictionStoreSchema)).toEqual(store)
  })

  it('未保存キーは null', () => {
    expect(getItem('wck:none', favoriteTeamSchema)).toBeNull()
  })

  it('JSON破損は握り潰して null', () => {
    localStorage.setItem('wck:predictions', '{not valid json')
    expect(getItem('wck:predictions', predictionStoreSchema)).toBeNull()
  })

  it('スキーマ不一致は握り潰して null', () => {
    localStorage.setItem('wck:predictions', JSON.stringify({ foo: 'bar' }))
    expect(getItem('wck:predictions', predictionStoreSchema)).toBeNull()
  })

  it('旧バージョン（version不一致）は null', () => {
    localStorage.setItem(
      'wck:predictions',
      JSON.stringify({ version: 99, picks: {}, updatedAt: '' }),
    )
    expect(getItem('wck:predictions', predictionStoreSchema)).toBeNull()
  })

  it('removeItem で削除できる', () => {
    setItem('wck:favorite-team', 'JPN')
    removeItem('wck:favorite-team')
    expect(getItem('wck:favorite-team', favoriteTeamSchema)).toBeNull()
  })

  it('safeStorage オブジェクト経由でも動作する', () => {
    safeStorage.set('wck:favorite-team', 'BRA')
    expect(safeStorage.get('wck:favorite-team', favoriteTeamSchema)).toBe('BRA')
    safeStorage.remove('wck:favorite-team')
    expect(safeStorage.get('wck:favorite-team', favoriteTeamSchema)).toBeNull()
  })
})
