/**
 * データ取得インターフェース。
 * 静的JSON実装（static-repository）と将来のライブAPI実装を差し替え可能にする。
 */
import type {
  CountryCode,
  Group,
  GroupId,
  GroupStanding,
  Match,
  Player,
  RuleLesson,
  Stadium,
  Team,
  Term,
} from '@/lib/domain'

export interface WorldCupRepository {
  getTeams(): Promise<Team[]>
  getTeamByCode(code: CountryCode): Promise<Team | null>
  getGroups(): Promise<Group[]>
  getStadiums(): Promise<Stadium[]>
  getMatches(): Promise<Match[]>
  getMatchesByGroup(groupId: GroupId): Promise<Match[]>
  getMatchesByTeam(code: CountryCode): Promise<Match[]>
  getKnockoutMatches(): Promise<Match[]>
  /** 順位表（matches から計算 or ライブAPIから取得） */
  getGroupStandings(groupId: GroupId): Promise<GroupStanding[]>
  getPlayersByTeam(code: CountryCode): Promise<Player[]>
  getTerms(): Promise<Term[]>
  getRuleLessons(): Promise<RuleLesson[]>
  getRuleLesson(slug: string): Promise<RuleLesson | null>
}
