/**
 * openfootball 生JSON → 内部ドメイン型 への正規化（純関数群）。
 *
 * 生データは src/data/raw/ に無改変で同梱され、コンテンツは src/data/*.json に分離されている。
 * ここでの正規化はモジュール評価時（static-repository）に一度だけ実行される。
 */
import type {
  Confederation,
  CountryCode,
  Group,
  GroupId,
  Match,
  MatchStage,
  Player,
  Stadium,
  StadiumCountry,
  Team,
  TeamRegion,
  TeamStyle,
  TeamTier,
} from '@/lib/domain'
import { GROUP_IDS, STAGE_LABELS } from '@/lib/constants/tournament'
import { toUtcIso } from '@/lib/utils/date'

// ── 生データの型（読み取り専用・openfootball / content の形に対応） ──

export interface RawTeam {
  name: string
  name_normalised?: string
  continent: string
  flag_icon: string
  flag_unicode: string
  fifa_code: string
  group: string
  confed: string
}

export interface RawMatch {
  round: string
  date: string
  time: string
  team1: string
  team2: string
  group?: string
  ground: string
  score?: { ft?: [number, number]; p?: [number, number] }
}

export interface RawStadium {
  city: string
  timezone: string
  cc: string
  name: string
  capacity?: number
  coords?: string
}

export interface CountryContent {
  code: string
  nameJa: string
  blurbJa: string
  watchPointJa: string
  funFactsJa: string[]
  style: TeamStyle
  tier: TeamTier
  region: TeamRegion
  vibeJa: string[]
}

export interface PlayerContent {
  code: string
  players: Array<{
    nameJa: string
    position: Player['position']
    highlightJa: string
  }>
}

// ── 写像テーブル ──

const CC_TO_COUNTRY: Record<string, StadiumCountry> = {
  us: 'USA',
  ca: 'CAN',
  mx: 'MEX',
}

const CONFED_MAP: Record<string, Confederation> = {
  UEFA: 'UEFA',
  CONMEBOL: 'CONMEBOL',
  CAF: 'CAF',
  AFC: 'AFC',
  CONCACAF: 'CONCACAF',
  OFC: 'OFC',
}

/** "Round of 32" などの決勝Tラウンド名 → MatchStage */
const KO_ROUND_TO_STAGE: Record<string, MatchStage> = {
  'Round of 32': 'round32',
  'Round of 16': 'round16',
  'Quarter-final': 'quarter',
  'Semi-final': 'semi',
  'Match for third place': 'third',
  Final: 'final',
}

/** 文字列をスラッグ化（city → stadium id） */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 決勝Tのプレースホルダ文字列を日本語化する。
 * - "2A"            → "A組2位"
 * - "1E"            → "E組1位"
 * - "3A/B/C/D/F"    → "3位通過(A/B/C/D/F組)"
 * - "W101"          → "第101試合の勝者"
 * - "L102"          → "第102試合の敗者"
 * 未知の形式はそのまま返す。
 */
export function placeholderToJa(raw: string): string {
  const trimmed = raw.trim()

  // 3位通過: "3A/B/C/D/F"
  const thirdMatch = trimmed.match(/^3([A-L](?:\/[A-L])+)$/)
  if (thirdMatch) {
    return `3位通過(${thirdMatch[1]}組)`
  }

  // 順位+グループ: "2A", "1E"
  const rankMatch = trimmed.match(/^([1-4])([A-L])$/)
  if (rankMatch) {
    return `${rankMatch[2]}組${rankMatch[1]}位`
  }

  // 勝者: "W101"
  const winnerMatch = trimmed.match(/^W(\d+)$/)
  if (winnerMatch) {
    return `第${winnerMatch[1]}試合の勝者`
  }

  // 敗者: "L102"
  const loserMatch = trimmed.match(/^L(\d+)$/)
  if (loserMatch) {
    return `第${loserMatch[1]}試合の敗者`
  }

  return trimmed
}

/** "Group A" → "A"（GroupIdに変換）。無効なら null */
function parseGroupId(group: string | undefined): GroupId | null {
  if (!group) return null
  const m = group.trim().match(/^Group ([A-L])$/)
  if (!m) return null
  return m[1] as GroupId
}

/** round 文字列から stage と groupId を導出 */
export function deriveStage(
  round: string,
  group: string | undefined,
): { stage: MatchStage; groupId: GroupId | null } {
  const ko = KO_ROUND_TO_STAGE[round]
  if (ko) {
    return { stage: ko, groupId: null }
  }
  // "Matchday N" はグループステージ
  return { stage: 'group', groupId: parseGroupId(group) }
}

/**
 * チームを正規化。fifa_code でコンテンツとマージする。
 */
export function normalizeTeams(
  rawTeams: RawTeam[],
  countriesContent: CountryContent[],
): Team[] {
  const contentByCode = new Map(countriesContent.map((c) => [c.code, c]))

  return rawTeams.map((raw) => {
    const content = contentByCode.get(raw.fifa_code)
    if (!content) {
      throw new Error(`コンテンツが見つかりません: ${raw.fifa_code}`)
    }
    const groupId = raw.group as GroupId
    return {
      code: raw.fifa_code,
      nameEn: raw.name,
      nameJa: content.nameJa,
      groupId,
      flagEmoji: raw.flag_icon,
      confed: CONFED_MAP[raw.confed] ?? 'UEFA',
      region: content.region,
      style: content.style,
      tier: content.tier,
      blurbJa: content.blurbJa,
      watchPointJa: content.watchPointJa,
      funFactsJa: content.funFactsJa,
      vibeJa: content.vibeJa,
    }
  })
}

/**
 * グループ（A〜L）を Team[] から構築。
 */
export function buildGroups(teams: Team[]): Group[] {
  return GROUP_IDS.map((id) => ({
    id,
    label: `グループ${id}`,
    teamCodes: teams.filter((t) => t.groupId === id).map((t) => t.code),
  }))
}

/**
 * 会場を正規化。id は city のスラッグ。
 */
export function normalizeStadiums(rawStadiums: RawStadium[]): Stadium[] {
  return rawStadiums.map((raw) => ({
    id: slugify(raw.city),
    name: raw.name,
    city: raw.city,
    country: CC_TO_COUNTRY[raw.cc] ?? 'USA',
    timezone: raw.timezone,
    capacity: raw.capacity,
    coords: raw.coords,
  }))
}

/** チーム名（nameEn または name_normalised）→ code の逆引きを構築 */
function buildTeamNameIndex(
  teams: Team[],
  rawTeams: RawTeam[],
): Map<string, CountryCode> {
  const index = new Map<string, CountryCode>()
  for (const t of teams) {
    index.set(t.nameEn, t.code)
  }
  for (const r of rawTeams) {
    if (r.name_normalised) {
      index.set(r.name_normalised, r.fifa_code)
    }
  }
  return index
}

/** 連番ID（"wc-001" 形式） */
function matchId(index: number): string {
  return `wc-${String(index + 1).padStart(3, '0')}`
}

/** score.ft 配列を内部スコア型に変換 */
function parseScore(raw: RawMatch): Match['score'] {
  const ft = raw.score?.ft
  if (!ft || ft.length < 2) return null
  return { home: ft[0], away: ft[1] }
}

function parsePenalties(raw: RawMatch): Match['penalties'] | undefined {
  const p = raw.score?.p
  if (!p || p.length < 2) return undefined
  return { home: p[0], away: p[1] }
}

/**
 * 試合を正規化。
 * - team1/team2 を実チームに解決、不一致はプレースホルダ日本語化。
 * - ground(=city) で stadium を解決。
 * - id はソース配列順で安定。
 */
export function normalizeMatches(
  rawMatches: RawMatch[],
  teams: Team[],
  stadiums: Stadium[],
  rawTeams: RawTeam[],
): Match[] {
  const nameIndex = buildTeamNameIndex(teams, rawTeams)
  const stadiumByCity = new Map(stadiums.map((s) => [s.city, s.id]))

  return rawMatches.map((raw, i) => {
    const { stage, groupId } = deriveStage(raw.round, raw.group)

    const homeCode = nameIndex.get(raw.team1) ?? null
    const awayCode = nameIndex.get(raw.team2) ?? null
    const homePlaceholderJa =
      homeCode === null ? placeholderToJa(raw.team1) : undefined
    const awayPlaceholderJa =
      awayCode === null ? placeholderToJa(raw.team2) : undefined

    const stadiumId = stadiumByCity.get(raw.ground) ?? null

    const penalties = parsePenalties(raw)

    return {
      id: matchId(i),
      stage,
      groupId,
      kickoffUtc: toUtcIso(raw.date, raw.time),
      homeTeamCode: homeCode,
      awayTeamCode: awayCode,
      homePlaceholderJa,
      awayPlaceholderJa,
      stadiumId,
      score: parseScore(raw),
      ...(penalties ? { penalties } : {}),
      roundLabelJa: STAGE_LABELS[stage],
    }
  })
}

/**
 * 注目選手を正規化。id は "{code}-{index}"。
 */
export function normalizePlayers(playerContent: PlayerContent[]): Player[] {
  const out: Player[] = []
  for (const group of playerContent) {
    group.players.forEach((p, i) => {
      out.push({
        id: `${group.code}-${i + 1}`,
        nameJa: p.nameJa,
        teamCode: group.code,
        position: p.position,
        highlightJa: p.highlightJa,
      })
    })
  }
  return out
}
