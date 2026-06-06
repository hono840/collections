/**
 * 注目選手（手動キュレーション）に関するドメイン型。
 */
import type { CountryCode } from './team'

/** ポジション */
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'

export interface Player {
  /** 一意ID（"{teamCode}-{index}" で正規化時に採番） */
  id: string
  nameJa: string
  teamCode: CountryCode
  position: PlayerPosition
  /** 初心者向け注目ポイント */
  highlightJa: string
}
