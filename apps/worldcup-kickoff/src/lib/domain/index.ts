/**
 * ドメイン型の re-export。アプリ全体は `@/lib/domain` から型をimportする。
 */
export type {
  CountryCode,
  Confederation,
  Team,
  TeamRegion,
  TeamStyle,
  TeamTier,
} from './team'
export type { Group, GroupId, GroupStanding } from './group'
export type { Stadium, StadiumCountry } from './stadium'
export type { Match, MatchStage } from './match'
export type { Player, PlayerPosition } from './player'
export type { Term, TermCategory } from './term'
export type {
  RuleBlock,
  RuleInteractive,
  RuleLesson,
} from './rule'
export type { PredictionPick, PredictionStore } from './prediction'
export type { DiagnosisResult, LearningProgress } from './diagnosis'
