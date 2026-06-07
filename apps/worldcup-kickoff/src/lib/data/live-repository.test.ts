import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLiveRepository } from './live-repository'
import type { WorldCupRepository } from './repository'
import type {
  Group,
  GroupStanding,
  Match,
  Player,
  RuleLesson,
  Stadium,
  Team,
  Term,
} from '@/lib/domain'

// ── 固定フィクスチャ（base が返す静的データ） ──

const team: Team = {
  code: 'JPN',
  nameEn: 'Japan',
  nameJa: '日本',
  groupId: 'C',
  flagEmoji: '🇯🇵',
  confed: 'AFC',
  region: 'asia',
  style: 'balanced',
  tier: 'darkhorse',
  tierReasonJa: '組織力で上位を狙えるからです。',
  blurbJa: 'アジアの強豪。',
  watchPointJa: '組織的な守備が見どころ。',
  funFactsJa: ['7大会連続出場'],
  vibeJa: ['組織力'],
}

const group: Group = {
  id: 'C',
  label: 'グループC',
  teamCodes: ['JPN'],
}

const stadium: Stadium = {
  id: 'mexico-city',
  name: 'Estadio Azteca',
  city: 'Mexico City',
  country: 'MEX',
  timezone: 'UTC-6',
  capacity: 87000,
}

const match: Match = {
  id: 'wc-001',
  stage: 'group',
  groupId: 'C',
  kickoffUtc: '2026-06-11T19:00:00.000Z',
  homeTeamCode: 'JPN',
  awayTeamCode: 'KOR',
  stadiumId: 'mexico-city',
  score: null,
  roundLabelJa: 'グループステージ',
}

const knockoutMatch: Match = {
  id: 'wc-073',
  stage: 'round32',
  groupId: null,
  kickoffUtc: '2026-06-28T19:00:00.000Z',
  homeTeamCode: null,
  awayTeamCode: null,
  homePlaceholderJa: 'A組2位',
  awayPlaceholderJa: '3位通過(A/B/C/D/F組)',
  stadiumId: 'mexico-city',
  score: null,
  roundLabelJa: 'ラウンド32',
}

const player: Player = {
  id: 'JPN-1',
  nameJa: '遠藤 航',
  teamCode: 'JPN',
  position: 'MF',
  highlightJa: '中盤の要。',
}

const term: Term = {
  slug: 'offside',
  termJa: 'オフサイド',
  definitionJa: '攻撃側の反則。',
  category: 'rule',
}

const ruleLesson: RuleLesson = {
  slug: 'offside',
  titleJa: 'オフサイド入門',
  order: 1,
  estimatedMinutes: 3,
  bodyBlocks: [{ type: 'paragraph', text: '基本の解説。' }],
  interactive: null,
  relatedTermSlugs: ['offside'],
}

const standing: GroupStanding = {
  teamCode: 'JPN',
  played: 1,
  won: 1,
  drawn: 0,
  lost: 0,
  goalsFor: 2,
  goalsAgainst: 0,
  goalDifference: 2,
  points: 3,
  rank: 1,
}

/** WorldCupRepository を満たす最小のフェイク base。各メソッドは固定値を返すスパイ。 */
function makeFakeBase(): WorldCupRepository {
  return {
    getTeams: vi.fn(async () => [team]),
    getTeamByCode: vi.fn(async () => team),
    getGroups: vi.fn(async () => [group]),
    getStadiums: vi.fn(async () => [stadium]),
    getMatches: vi.fn(async () => [match, knockoutMatch]),
    getMatchesByGroup: vi.fn(async () => [match]),
    getMatchesByTeam: vi.fn(async () => [match]),
    getKnockoutMatches: vi.fn(async () => [knockoutMatch]),
    getGroupStandings: vi.fn(async () => [standing]),
    getPlayersByTeam: vi.fn(async () => [player]),
    getTerms: vi.fn(async () => [term]),
    getRuleLessons: vi.fn(async () => [ruleLesson]),
    getRuleLesson: vi.fn(async () => ruleLesson),
  }
}

describe('createLiveRepository', () => {
  let originalApiKey: string | undefined
  let originalApiBase: string | undefined

  beforeEach(() => {
    originalApiKey = process.env.WORLDCUP_LIVE_API_KEY
    originalApiBase = process.env.WORLDCUP_LIVE_API_BASE
    // ライブ取得を無効化（= 完全に静的フォールバック）した状態を既定にする
    delete process.env.WORLDCUP_LIVE_API_KEY
    delete process.env.WORLDCUP_LIVE_API_BASE
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.WORLDCUP_LIVE_API_KEY
    else process.env.WORLDCUP_LIVE_API_KEY = originalApiKey
    if (originalApiBase === undefined) delete process.env.WORLDCUP_LIVE_API_BASE
    else process.env.WORLDCUP_LIVE_API_BASE = originalApiBase
  })

  it('WorldCupRepository を満たすオブジェクトを返す', () => {
    const repo = createLiveRepository(makeFakeBase())
    const methods: (keyof WorldCupRepository)[] = [
      'getTeams',
      'getTeamByCode',
      'getGroups',
      'getStadiums',
      'getMatches',
      'getMatchesByGroup',
      'getMatchesByTeam',
      'getKnockoutMatches',
      'getGroupStandings',
      'getPlayersByTeam',
      'getTerms',
      'getRuleLessons',
      'getRuleLesson',
    ]
    for (const m of methods) {
      expect(typeof repo[m]).toBe('function')
    }
  })

  // ── 静的コンテンツ系: base へ委譲する ──

  describe('静的コンテンツ系は base に委譲する', () => {
    it('getTeams は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getTeams()).resolves.toEqual([team])
      expect(base.getTeams).toHaveBeenCalledTimes(1)
    })

    it('getTeamByCode は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getTeamByCode('JPN')).resolves.toEqual(team)
      expect(base.getTeamByCode).toHaveBeenCalledWith('JPN')
    })

    it('getGroups は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getGroups()).resolves.toEqual([group])
      expect(base.getGroups).toHaveBeenCalledTimes(1)
    })

    it('getStadiums は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getStadiums()).resolves.toEqual([stadium])
      expect(base.getStadiums).toHaveBeenCalledTimes(1)
    })

    it('getPlayersByTeam は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getPlayersByTeam('JPN')).resolves.toEqual([player])
      expect(base.getPlayersByTeam).toHaveBeenCalledWith('JPN')
    })

    it('getTerms は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getTerms()).resolves.toEqual([term])
      expect(base.getTerms).toHaveBeenCalledTimes(1)
    })

    it('getRuleLessons は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getRuleLessons()).resolves.toEqual([ruleLesson])
      expect(base.getRuleLessons).toHaveBeenCalledTimes(1)
    })

    it('getRuleLesson は base の結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getRuleLesson('offside')).resolves.toEqual(ruleLesson)
      expect(base.getRuleLesson).toHaveBeenCalledWith('offside')
    })
  })

  // ── ライブ対象系: env 未設定時は base へフォールバック ──

  describe('ライブ取得が無効（env 未設定）なら base 値へフォールバックする', () => {
    it('getMatches は base と同じ結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getMatches()).resolves.toEqual([match, knockoutMatch])
      expect(base.getMatches).toHaveBeenCalledTimes(1)
    })

    it('getMatchesByGroup は base と同じ結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getMatchesByGroup('C')).resolves.toEqual([match])
      expect(base.getMatchesByGroup).toHaveBeenCalledWith('C')
    })

    it('getMatchesByTeam は base と同じ結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getMatchesByTeam('JPN')).resolves.toEqual([match])
      expect(base.getMatchesByTeam).toHaveBeenCalledWith('JPN')
    })

    it('getKnockoutMatches は base と同じ結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getKnockoutMatches()).resolves.toEqual([knockoutMatch])
      expect(base.getKnockoutMatches).toHaveBeenCalledTimes(1)
    })

    it('getGroupStandings は base（静的計算）と同じ結果を返す', async () => {
      const base = makeFakeBase()
      const repo = createLiveRepository(base)
      await expect(repo.getGroupStandings('C')).resolves.toEqual([standing])
      expect(base.getGroupStandings).toHaveBeenCalledWith('C')
    })
  })

  // ── env が設定されていてもスタブは null 返却 → 静的と同挙動 ──

  it('env が設定されていてもライブはスタブのため base 値へフォールバックする', async () => {
    process.env.WORLDCUP_LIVE_API_KEY = 'dummy-key'
    process.env.WORLDCUP_LIVE_API_BASE = 'https://example.test/api'
    const base = makeFakeBase()
    const repo = createLiveRepository(base)
    await expect(repo.getMatches()).resolves.toEqual([match, knockoutMatch])
    await expect(repo.getGroupStandings('C')).resolves.toEqual([standing])
  })
})
