/**
 * グループ（A〜L）に関するドメイン型。
 */

/** グループID（"A"〜"L"の12グループ） */
export type GroupId =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'

/** 1グループの定義 */
export interface Group {
  id: GroupId
  /** 表示ラベル（例: "グループA"） */
  label: string
  /** 所属国コード（4ヶ国） */
  teamCodes: CountryCode[]
}

/**
 * 順位表の1行。matches から計算する派生データであり永続化しない。
 */
export interface GroupStanding {
  teamCode: CountryCode
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  /** 1位〜4位。同点時は勝点→得失点差→総得点で決定 */
  rank: number
}

import type { CountryCode } from './team'
