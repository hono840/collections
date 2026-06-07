import { describe, it, expect } from 'vitest'
import {
  deriveStage,
  placeholderToJa,
  slugify,
  normalizeTeams,
  normalizeStadiums,
  normalizeMatches,
  normalizePlayers,
  buildGroups,
  type RawTeam,
  type RawMatch,
  type RawStadium,
  type CountryContent,
  type PlayerContent,
} from './normalize'
import { __normalized } from './static-repository'

describe('placeholderToJa', () => {
  it('順位+グループ形式を日本語化する', () => {
    expect(placeholderToJa('2A')).toBe('A組2位')
    expect(placeholderToJa('1E')).toBe('E組1位')
    expect(placeholderToJa('4L')).toBe('L組4位')
  })

  it('3位通過形式を日本語化する', () => {
    expect(placeholderToJa('3A/B/C/D/F')).toBe('3位通過(A/B/C/D/F組)')
    expect(placeholderToJa('3E/H/I/J/K')).toBe('3位通過(E/H/I/J/K組)')
  })

  it('勝者・敗者形式を日本語化する', () => {
    expect(placeholderToJa('W101')).toBe('第101試合の勝者')
    expect(placeholderToJa('W73')).toBe('第73試合の勝者')
    expect(placeholderToJa('L102')).toBe('第102試合の敗者')
  })

  it('未知の形式はそのまま返す', () => {
    expect(placeholderToJa('???')).toBe('???')
  })
})

describe('slugify', () => {
  it('都市名をスラッグ化する', () => {
    expect(slugify('Mexico City')).toBe('mexico-city')
    expect(slugify('Guadalajara (Zapopan)')).toBe('guadalajara-zapopan')
    expect(slugify('New York/New Jersey (East Rutherford)')).toBe(
      'new-york-new-jersey-east-rutherford',
    )
  })
})

describe('deriveStage', () => {
  it('Matchday はグループステージ', () => {
    expect(deriveStage('Matchday 1', 'Group A')).toEqual({
      stage: 'group',
      groupId: 'A',
    })
    expect(deriveStage('Matchday 17', 'Group L')).toEqual({
      stage: 'group',
      groupId: 'L',
    })
  })

  it('決勝Tラウンドを正しく写像する', () => {
    expect(deriveStage('Round of 32', undefined)).toEqual({
      stage: 'round32',
      groupId: null,
    })
    expect(deriveStage('Round of 16', undefined)).toEqual({
      stage: 'round16',
      groupId: null,
    })
    expect(deriveStage('Quarter-final', undefined)).toEqual({
      stage: 'quarter',
      groupId: null,
    })
    expect(deriveStage('Semi-final', undefined)).toEqual({
      stage: 'semi',
      groupId: null,
    })
    expect(deriveStage('Match for third place', undefined)).toEqual({
      stage: 'third',
      groupId: null,
    })
    expect(deriveStage('Final', undefined)).toEqual({
      stage: 'final',
      groupId: null,
    })
  })
})

// ── 合成データでの正規化テスト ──

const rawTeams: RawTeam[] = [
  {
    name: 'Japan',
    continent: 'Asia',
    flag_icon: '🇯🇵',
    flag_unicode: '',
    fifa_code: 'JPN',
    group: 'C',
    confed: 'AFC',
  },
  {
    name: 'South Korea',
    name_normalised: 'Korea Republic',
    continent: 'Asia',
    flag_icon: '🇰🇷',
    flag_unicode: '',
    fifa_code: 'KOR',
    group: 'A',
    confed: 'AFC',
  },
]

const content: CountryContent[] = [
  {
    code: 'JPN',
    nameJa: '日本',
    blurbJa: 'b',
    watchPointJa: 'w',
    funFactsJa: ['f'],
    style: 'balanced',
    tier: 'darkhorse',
    tierReasonJa: '安定した組織力で上位を狙えるからです。',
    region: 'asia',
    vibeJa: ['組織力'],
  },
  {
    code: 'KOR',
    nameJa: '韓国',
    blurbJa: 'b',
    watchPointJa: 'w',
    funFactsJa: ['f'],
    style: 'attacking',
    tier: 'underdog',
    tierReasonJa: '勢いはありますが格上に挑む立場だからです。',
    region: 'asia',
    vibeJa: ['運動量'],
  },
]

const rawStadiums: RawStadium[] = [
  {
    city: 'Mexico City',
    timezone: 'UTC-6',
    cc: 'mx',
    name: 'Estadio Azteca',
    capacity: 87000,
  },
  {
    city: 'Guadalajara (Zapopan)',
    timezone: 'UTC-6',
    cc: 'mx',
    name: 'Estadio Akron',
    capacity: 49000,
  },
]

describe('normalizeTeams', () => {
  it('fifa_code でコンテンツとマージする', () => {
    const teams = normalizeTeams(rawTeams, content)
    expect(teams).toHaveLength(2)
    const jpn = teams.find((t) => t.code === 'JPN')!
    expect(jpn.nameEn).toBe('Japan')
    expect(jpn.nameJa).toBe('日本')
    expect(jpn.groupId).toBe('C')
    expect(jpn.flagEmoji).toBe('🇯🇵')
    expect(jpn.confed).toBe('AFC')
    expect(jpn.style).toBe('balanced')
    expect(jpn.region).toBe('asia')
    expect(jpn.vibeJa).toEqual(['組織力'])
    expect(jpn.tier).toBe('darkhorse')
    expect(jpn.tierReasonJa).toBe('安定した組織力で上位を狙えるからです。')
  })

  it('コンテンツ欠落時はエラー', () => {
    expect(() => normalizeTeams(rawTeams, [content[0]])).toThrow()
  })
})

describe('normalizeStadiums', () => {
  it('id は city のスラッグ、country は cc 大文字化', () => {
    const stadiums = normalizeStadiums(rawStadiums)
    expect(stadiums[0].id).toBe('mexico-city')
    expect(stadiums[0].country).toBe('MEX')
    expect(stadiums[0].city).toBe('Mexico City')
    expect(stadiums[0].timezone).toBe('UTC-6')
  })
})

describe('normalizeMatches', () => {
  const teams = normalizeTeams(rawTeams, content)
  const stadiums = normalizeStadiums(rawStadiums)

  it('グループ試合: チーム名解決・stadium解決・stage導出', () => {
    const raw: RawMatch[] = [
      {
        round: 'Matchday 1',
        date: '2026-06-11',
        time: '13:00 UTC-6',
        team1: 'Japan',
        team2: 'South Korea',
        group: 'Group C',
        ground: 'Mexico City',
      },
    ]
    const matches = normalizeMatches(raw, teams, stadiums, rawTeams)
    expect(matches[0].id).toBe('wc-001')
    expect(matches[0].stage).toBe('group')
    expect(matches[0].groupId).toBe('C')
    expect(matches[0].homeTeamCode).toBe('JPN')
    expect(matches[0].awayTeamCode).toBe('KOR')
    expect(matches[0].homePlaceholderJa).toBeUndefined()
    expect(matches[0].stadiumId).toBe('mexico-city')
    expect(matches[0].roundLabelJa).toBe('グループステージ')
  })

  it('name_normalised でもチームを解決できる', () => {
    const raw: RawMatch[] = [
      {
        round: 'Matchday 2',
        date: '2026-06-12',
        time: '20:00 UTC-6',
        team1: 'Korea Republic',
        team2: 'Japan',
        group: 'Group C',
        ground: 'Guadalajara (Zapopan)',
      },
    ]
    const matches = normalizeMatches(raw, teams, stadiums, rawTeams)
    expect(matches[0].homeTeamCode).toBe('KOR')
    expect(matches[0].awayTeamCode).toBe('JPN')
  })

  it('決勝T: プレースホルダを日本語化、コードは null', () => {
    const raw: RawMatch[] = [
      {
        round: 'Round of 32',
        date: '2026-06-28',
        time: '12:00 UTC-7',
        team1: '2A',
        team2: '3A/B/C/D/F',
        ground: 'Mexico City',
      },
    ]
    const matches = normalizeMatches(raw, teams, stadiums, rawTeams)
    expect(matches[0].stage).toBe('round32')
    expect(matches[0].groupId).toBeNull()
    expect(matches[0].homeTeamCode).toBeNull()
    expect(matches[0].awayTeamCode).toBeNull()
    expect(matches[0].homePlaceholderJa).toBe('A組2位')
    expect(matches[0].awayPlaceholderJa).toBe('3位通過(A/B/C/D/F組)')
    expect(matches[0].roundLabelJa).toBe('ラウンド32')
  })

  it('kickoffUtc: 13:00 UTC-6 → 19:00 UTC（JSTで翌4:00相当）', () => {
    const raw: RawMatch[] = [
      {
        round: 'Matchday 1',
        date: '2026-06-11',
        time: '13:00 UTC-6',
        team1: 'Japan',
        team2: 'South Korea',
        group: 'Group C',
        ground: 'Mexico City',
      },
    ]
    const matches = normalizeMatches(raw, teams, stadiums, rawTeams)
    expect(matches[0].kickoffUtc).toBe('2026-06-11T19:00:00.000Z')
  })

  it('ID はソース配列順で安定（wc-001..）', () => {
    const raw: RawMatch[] = Array.from({ length: 3 }, () => ({
      round: 'Matchday 1',
      date: '2026-06-11',
      time: '13:00 UTC-6',
      team1: 'Japan',
      team2: 'South Korea',
      group: 'Group C',
      ground: 'Mexico City',
    }))
    const matches = normalizeMatches(raw, teams, stadiums, rawTeams)
    expect(matches.map((m) => m.id)).toEqual(['wc-001', 'wc-002', 'wc-003'])
  })
})

describe('buildGroups', () => {
  it('12グループを構築し、所属国を割り当てる', () => {
    const teams = normalizeTeams(rawTeams, content)
    const groups = buildGroups(teams)
    expect(groups).toHaveLength(12)
    expect(groups.find((g) => g.id === 'C')!.teamCodes).toEqual(['JPN'])
    expect(groups.find((g) => g.id === 'A')!.teamCodes).toEqual(['KOR'])
    expect(groups.find((g) => g.id === 'C')!.label).toBe('グループC')
  })
})

describe('normalizePlayers', () => {
  it('id を {code}-{index} で採番する', () => {
    const pc: PlayerContent[] = [
      {
        code: 'JPN',
        players: [
          { nameJa: '選手A', position: 'FW', highlightJa: 'h' },
          { nameJa: '選手B', position: 'GK', highlightJa: 'h' },
        ],
      },
    ]
    const players = normalizePlayers(pc)
    expect(players).toHaveLength(2)
    expect(players[0].id).toBe('JPN-1')
    expect(players[1].id).toBe('JPN-2')
    expect(players[0].teamCode).toBe('JPN')
  })
})

// ── 実データ全体の整合性 ──

describe('実データ正規化（static-repository）', () => {
  it('チーム=48・グループ=12・会場=16', () => {
    expect(__normalized.teams).toHaveLength(48)
    expect(__normalized.groups).toHaveLength(12)
    expect(__normalized.stadiums).toHaveLength(16)
  })

  it('試合=104（グループ72・決勝T32）', () => {
    expect(__normalized.matches).toHaveLength(104)
    const group = __normalized.matches.filter((m) => m.stage === 'group')
    const knockout = __normalized.matches.filter((m) => m.stage !== 'group')
    expect(group).toHaveLength(72)
    expect(knockout).toHaveLength(32)
  })

  it('全グループ試合はチームコードが解決済み', () => {
    const group = __normalized.matches.filter((m) => m.stage === 'group')
    for (const m of group) {
      expect(m.homeTeamCode).not.toBeNull()
      expect(m.awayTeamCode).not.toBeNull()
    }
  })

  it('全決勝T試合はプレースホルダ（コードnull）', () => {
    const knockout = __normalized.matches.filter((m) => m.stage !== 'group')
    for (const m of knockout) {
      expect(m.homeTeamCode).toBeNull()
      expect(m.awayTeamCode).toBeNull()
      expect(m.homePlaceholderJa).toBeTruthy()
      expect(m.awayPlaceholderJa).toBeTruthy()
    }
  })

  it('全試合に会場が解決されている', () => {
    for (const m of __normalized.matches) {
      expect(m.stadiumId).not.toBeNull()
    }
  })

  it('各グループは4チーム', () => {
    for (const g of __normalized.groups) {
      expect(g.teamCodes).toHaveLength(4)
    }
  })

  it('開幕戦のkickoffUtcが正しい（メキシコ 13:00 UTC-6 → 19:00 UTC）', () => {
    const opener = __normalized.matches[0]
    expect(opener.kickoffUtc).toBe('2026-06-11T19:00:00.000Z')
  })
})
