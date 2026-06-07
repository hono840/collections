/**
 * tier（大会での位置づけ）の表示メタデータ。
 *
 * バッジの色・ラベル、凡例（TierLegend）で使う「意味」「基準」、注記をここに集約する。
 * CountryListItem / CountryDetailPanel / TierLegend はこの単一定義を参照し、
 * 文言・配色のハードコード重複を避ける。
 */
import type { TeamTier } from '@/lib/domain'
import type { BadgeVariant } from '@/components/atoms/Badge'

export interface TierMeta {
  tier: TeamTier
  label: string
  variant: Extract<BadgeVariant, 'gold' | 'pitch' | 'neutral'>
  summaryJa: string
  criteriaJa: string
}

/** favorite → darkhorse → underdog（強い順）。凡例・一覧で使う表示順 */
export const TIER_ORDER: TeamTier[] = ['favorite', 'darkhorse', 'underdog']

export const TIER_META: Record<TeamTier, TierMeta> = {
  favorite: {
    tier: 'favorite',
    label: '優勝候補',
    variant: 'gold',
    summaryJa: '優勝を狙える実力のあるチーム',
    criteriaJa:
      '過去に優勝した経験や世界ランキング上位の実績があり、安定して強さを発揮してきた国です。',
  },
  darkhorse: {
    tier: 'darkhorse',
    label: 'ダークホース',
    variant: 'pitch',
    summaryJa: '上位を脅かす勢いのあるチーム',
    criteriaJa:
      '優勝候補にもひと泡吹かせそうな勢いや伸びしろがあり、波に乗れば上位進出も夢ではない国です。',
  },
  underdog: {
    tier: 'underdog',
    label: 'チャレンジャー',
    variant: 'neutral',
    summaryJa: '格上に挑む、フレッシュなチーム',
    criteriaJa:
      '初出場や久しぶりの出場で、強豪に立ち向かう挑戦者の立場。番狂わせを起こせばお祭り騒ぎです。',
  },
}

/** 凡例に添える注記（主観・目安である旨） */
export const TIER_DISCLAIMER_JA =
  'これは初心者向けの目安で、編集部の主観です。順位や結果を保証するものではありません。'
