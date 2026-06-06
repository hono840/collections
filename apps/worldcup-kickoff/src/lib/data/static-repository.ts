/**
 * 静的JSON実装（MVPの本体）。
 *
 * src/data/raw/*.json（openfootball生）と src/data/*.json（コンテンツ）を import し、
 * normalize.ts を通してモジュール評価時に一度だけ正規化する。
 * すべて同期処理だが、ライブAPI実装との互換のため async インターフェースで公開する。
 */
import type {
  CountryCode,
  Group,
  GroupId,
  Match,
  Player,
  RuleLesson,
  Stadium,
  Team,
  Term,
} from '@/lib/domain'
import type { WorldCupRepository } from './repository'
import {
  buildGroups,
  normalizeMatches,
  normalizePlayers,
  normalizeStadiums,
  normalizeTeams,
  type CountryContent,
  type PlayerContent,
  type RawMatch,
  type RawStadium,
  type RawTeam,
} from './normalize'
import { computeStandings } from './matches'

import rawTeamsJson from '@/data/raw/worldcup-2026.teams.json'
import rawMatchesJson from '@/data/raw/worldcup-2026.json'
import rawStadiumsJson from '@/data/raw/worldcup-2026.stadiums.json'
import countriesContentJson from '@/data/countries-content.json'
import playersJson from '@/data/players.json'
import termsJson from '@/data/terms.json'
import rulesJson from '@/data/rules.json'

// ── モジュール評価時に一度だけ正規化 ──

const rawTeams = rawTeamsJson as RawTeam[]
const rawMatches = (rawMatchesJson as { matches: RawMatch[] }).matches
const rawStadiums = (rawStadiumsJson as { stadiums: RawStadium[] }).stadiums
const countriesContent = countriesContentJson as CountryContent[]
const playerContent = playersJson as PlayerContent[]

const TEAMS: Team[] = normalizeTeams(rawTeams, countriesContent)
const GROUPS: Group[] = buildGroups(TEAMS)
const STADIUMS: Stadium[] = normalizeStadiums(rawStadiums)
const MATCHES: Match[] = normalizeMatches(rawMatches, TEAMS, STADIUMS, rawTeams)
const PLAYERS: Player[] = normalizePlayers(playerContent)
const TERMS: Term[] = termsJson as Term[]
const RULES: RuleLesson[] = (rulesJson as RuleLesson[])
  .slice()
  .sort((a, b) => a.order - b.order)

const teamByCode = new Map(TEAMS.map((t) => [t.code, t]))
const groupById = new Map(GROUPS.map((g) => [g.id, g]))
const ruleBySlug = new Map(RULES.map((r) => [r.slug, r]))

export const staticRepository: WorldCupRepository = {
  async getTeams() {
    return TEAMS
  },

  async getTeamByCode(code: CountryCode) {
    return teamByCode.get(code) ?? null
  },

  async getGroups() {
    return GROUPS
  },

  async getStadiums() {
    return STADIUMS
  },

  async getMatches() {
    return MATCHES
  },

  async getMatchesByGroup(groupId: GroupId) {
    return MATCHES.filter((m) => m.groupId === groupId)
  },

  async getMatchesByTeam(code: CountryCode) {
    return MATCHES.filter(
      (m) => m.homeTeamCode === code || m.awayTeamCode === code,
    )
  },

  async getKnockoutMatches() {
    return MATCHES.filter((m) => m.stage !== 'group')
  },

  async getGroupStandings(groupId: GroupId) {
    const group = groupById.get(groupId)
    const groupMatches = MATCHES.filter((m) => m.groupId === groupId)
    return computeStandings(groupMatches, group?.teamCodes)
  },

  async getPlayersByTeam(code: CountryCode) {
    return PLAYERS.filter((p) => p.teamCode === code)
  },

  async getTerms() {
    return TERMS
  },

  async getRuleLessons() {
    return RULES
  },

  async getRuleLesson(slug: string) {
    return ruleBySlug.get(slug) ?? null
  },
}

/** テスト・内部用に正規化済みデータを直接公開（リポジトリ経由が原則） */
export const __normalized = {
  teams: TEAMS,
  groups: GROUPS,
  stadiums: STADIUMS,
  matches: MATCHES,
  players: PLAYERS,
  terms: TERMS,
  rules: RULES,
}
