import { describe, it, expect } from 'vitest'
import { score, scoreTeams, type DiagnosisAnswers } from './scoring'
import { DIAGNOSIS_QUESTIONS } from './questions'
import { __normalized } from '@/lib/data/static-repository'

const teams = __normalized.teams

describe('診断スコアリング', () => {
  it('攻撃的×強豪×ヨーロッパの回答は欧州の優勝候補を上位に出す', () => {
    const answers: DiagnosisAnswers = {
      'play-style': 'attack',
      'who-to-cheer': 'favorite',
      region: 'europe',
      'team-vibe': 'stars',
      'second-country': 'strong-classic',
      'match-mood': 'beautiful',
    }
    const ranking = score(answers, teams, 5)
    // 上位5に欧州の favorite が含まれる（ESP/FRA/GER/ENG/POR/NED/BEL のいずれか）
    const euroFavorites = new Set(['ESP', 'FRA', 'GER', 'ENG', 'POR', 'NED', 'BEL'])
    const top = score(answers, teams, 3)
    expect(top.some((c) => euroFavorites.has(c))).toBe(true)
    expect(ranking).toHaveLength(5)
  })

  it('番狂わせ×アフリカ×挑戦者の回答はアフリカの伏兵を上位に', () => {
    const answers: DiagnosisAnswers = {
      'play-style': 'attack',
      'who-to-cheer': 'darkhorse',
      region: 'africa',
      'team-vibe': 'physical',
      'second-country': 'underdog-story',
      'match-mood': 'excited',
    }
    const top = score(answers, teams, 5)
    // アフリカの国が少なくとも1つ上位に入る
    const africanCodes = new Set(
      teams.filter((t) => t.region === 'africa').map((t) => t.code),
    )
    expect(top.some((c) => africanCodes.has(c))).toBe(true)
  })

  it('地域選択が結果に反映される（アジア選択でアジア勢が上がる）', () => {
    const asiaAnswers: DiagnosisAnswers = { region: 'asia' }
    const euroAnswers: DiagnosisAnswers = { region: 'europe' }
    const asiaTop = score(asiaAnswers, teams, 8)
    const euroTop = score(euroAnswers, teams, 8)
    const asianCodes = new Set(
      teams.filter((t) => t.region === 'asia').map((t) => t.code),
    )
    const asiaHits = asiaTop.filter((c) => asianCodes.has(c)).length
    const euroHits = euroTop.filter((c) => asianCodes.has(c)).length
    expect(asiaHits).toBeGreaterThan(euroHits)
  })

  it('全48国にスコアが付与される', () => {
    const answers: DiagnosisAnswers = { 'play-style': 'balance' }
    const scored = scoreTeams(answers, teams)
    expect(scored).toHaveLength(48)
  })

  it('スコアは降順、同点はコード昇順で安定', () => {
    const answers: DiagnosisAnswers = { 'play-style': 'balance' }
    const scored = scoreTeams(answers, teams)
    for (let i = 1; i < scored.length; i++) {
      const prev = scored[i - 1]
      const cur = scored[i]
      expect(prev.score).toBeGreaterThanOrEqual(cur.score)
      if (prev.score === cur.score) {
        expect(prev.code.localeCompare(cur.code)).toBeLessThanOrEqual(0)
      }
    }
  })

  it('回答ゼロでも落ちず、ランキングを返す', () => {
    const ranking = score({}, teams, 5)
    expect(ranking).toHaveLength(5)
  })

  it('未知のquestionId/optionIdは無視される', () => {
    const ranking = score(
      { unknown: 'x', 'play-style': 'nonexistent' },
      teams,
      3,
    )
    expect(ranking).toHaveLength(3)
  })

  it('設問は5〜7問で各設問に2つ以上の選択肢がある', () => {
    expect(DIAGNOSIS_QUESTIONS.length).toBeGreaterThanOrEqual(5)
    expect(DIAGNOSIS_QUESTIONS.length).toBeLessThanOrEqual(7)
    for (const q of DIAGNOSIS_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
    }
  })
})
