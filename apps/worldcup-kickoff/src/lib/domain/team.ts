/**
 * チーム（出場48ヶ国）に関するドメイン型。
 */
import type { GroupId } from './group'

/** FIFA 3文字国コード（例: "JPN"）。lookup・URLパラメータのキー */
export type CountryCode = string

/** プレースタイル（content由来） */
export type TeamStyle = 'attacking' | 'balanced' | 'defensive'

/** 大会での位置づけ（content由来） */
export type TeamTier = 'favorite' | 'darkhorse' | 'underdog'

/** 地域区分（content由来） */
export type TeamRegion =
  | 'europe'
  | 'south_america'
  | 'africa'
  | 'asia'
  | 'north_america'
  | 'oceania'

/** 大陸連盟 */
export type Confederation =
  | 'UEFA'
  | 'CONMEBOL'
  | 'CAF'
  | 'AFC'
  | 'CONCACAF'
  | 'OFC'

export interface Team {
  /** FIFA国コード（lookup・URLキー） */
  code: CountryCode
  /** openfootball の英語チーム名（matches とのJOINキー） */
  nameEn: string
  /** 日本語表記（例: "日本"） */
  nameJa: string
  /** 所属グループID（"A"〜"L"） */
  groupId: GroupId
  /** 国旗絵文字（第一候補。例: "🇯🇵"） */
  flagEmoji: string
  /** 大陸連盟 */
  confed: Confederation
  /** 地域区分（診断・図鑑用） */
  region: TeamRegion
  /** プレースタイル（診断用） */
  style: TeamStyle
  /** 大会での位置づけ（診断用） */
  tier: TeamTier
  /** 初心者向け一言紹介 */
  blurbJa: string
  /** 観戦ポイント */
  watchPointJa: string
  /** 豆知識 */
  funFactsJa: string[]
  /** 雰囲気タグ（診断・診断結果表示用） */
  vibeJa: string[]
}
