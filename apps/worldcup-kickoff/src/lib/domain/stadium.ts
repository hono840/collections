/**
 * 会場（16スタジアム）に関するドメイン型。
 */

/** 開催国（USA / CAN / MEX） */
export type StadiumCountry = 'USA' | 'CAN' | 'MEX'

export interface Stadium {
  /** city をスラッグ化した安定ID */
  id: string
  /** スタジアム名（例: "SoFi Stadium"） */
  name: string
  /** 都市名（openfootball の ground と一致するJOINキー） */
  city: string
  /** 開催国 */
  country: StadiumCountry
  /** タイムゾーン（例: "UTC-7"） */
  timezone: string
  /** 収容人数 */
  capacity?: number
  /** 座標（生データ由来の文字列） */
  coords?: string
}
