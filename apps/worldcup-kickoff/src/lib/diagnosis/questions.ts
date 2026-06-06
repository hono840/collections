/**
 * 推し国診断の設問定義。
 *
 * 各選択肢は team の属性（style / tier / region / vibe）への重みを持つ。
 * 初心者が直感で選べる平易な質問にする。scoring.ts がこの重みで国をランキングする。
 */
import type {
  TeamRegion,
  TeamStyle,
  TeamTier,
} from '@/lib/domain'

/** 選択肢が各属性カテゴリに与える重み */
export interface AnswerWeights {
  style?: Partial<Record<TeamStyle, number>>
  tier?: Partial<Record<TeamTier, number>>
  region?: Partial<Record<TeamRegion, number>>
  /** vibeJa タグへの加点（タグ名 → 重み） */
  vibe?: Record<string, number>
}

export interface DiagnosisOption {
  id: string
  label: string
  /** 補足（任意） */
  description?: string
  weights: AnswerWeights
}

export interface DiagnosisQuestion {
  id: string
  /** 設問文 */
  question: string
  options: DiagnosisOption[]
}

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    id: 'play-style',
    question: '応援するなら、どんなプレーが見たい？',
    options: [
      {
        id: 'attack',
        label: 'とにかく攻めまくる！点が入る試合',
        weights: {
          style: { attacking: 3 },
          vibe: { スピード: 1, 華やか: 1, テクニック: 1 },
        },
      },
      {
        id: 'defense',
        label: '堅い守りで0点に抑える、しぶとい戦い',
        weights: {
          style: { defensive: 3 },
          vibe: { 堅守: 2, 粘り強さ: 1, 規律: 1 },
        },
      },
      {
        id: 'balance',
        label: '攻めも守りもバランスよく、安定した試合',
        weights: {
          style: { balanced: 3 },
          vibe: { 組織力: 2, 勝負強さ: 1 },
        },
      },
    ],
  },
  {
    id: 'who-to-cheer',
    question: 'どっちを応援したい気持ちが強い？',
    options: [
      {
        id: 'favorite',
        label: '強豪が貫禄を見せる、王者の戦いにシビれたい',
        weights: {
          tier: { favorite: 3 },
          vibe: { スター軍団: 2, 伝統国: 1 },
        },
      },
      {
        id: 'darkhorse',
        label: '伏兵がジャイアントキリングを起こす番狂わせ！',
        weights: {
          tier: { darkhorse: 3 },
          vibe: { 伏兵: 2, 旋風: 2, のぼり調子: 1 },
        },
      },
      {
        id: 'underdog',
        label: '弱くても全力で挑む、応援したくなるチーム',
        weights: {
          tier: { underdog: 3 },
          vibe: { 挑戦者: 2, 闘志: 1, 初出場: 1 },
        },
      },
    ],
  },
  {
    id: 'region',
    question: 'なんとなく気になる地域は？',
    options: [
      {
        id: 'europe',
        label: 'ヨーロッパ（伝統と実力の強豪ぞろい）',
        weights: { region: { europe: 3 }, vibe: { 伝統国: 1, 組織力: 1 } },
      },
      {
        id: 'south_america',
        label: '南米（情熱あふれる華麗なサッカー）',
        weights: {
          region: { south_america: 3 },
          vibe: { 華やか: 1, 情熱: 1, 個人技: 1 },
        },
      },
      {
        id: 'africa',
        label: 'アフリカ（爆発的な身体能力とスピード）',
        weights: {
          region: { africa: 3 },
          vibe: { フィジカル: 1, スピード: 1, アフリカの雄: 1 },
        },
      },
      {
        id: 'asia',
        label: 'アジア（日本の近く、走り続ける運動量）',
        weights: {
          region: { asia: 3 },
          vibe: { 運動量: 1, 規律: 1, アジアの雄: 1 },
        },
      },
      {
        id: 'north_america',
        label: '北中米（開催国の盛り上がりを感じたい）',
        weights: { region: { north_america: 3 }, vibe: { 陽気: 1, 若さ: 1 } },
      },
    ],
  },
  {
    id: 'team-vibe',
    question: 'チームの雰囲気、どれが好み？',
    options: [
      {
        id: 'stars',
        label: 'スター選手がそろった、きらびやかな軍団',
        weights: {
          tier: { favorite: 1 },
          vibe: { スター軍団: 2, 華やか: 2, テクニック: 1 },
        },
      },
      {
        id: 'organized',
        label: '全員で連動する、規律ある組織的チーム',
        weights: {
          style: { balanced: 1 },
          vibe: { 組織力: 3, 規律: 1, 粘り強さ: 1 },
        },
      },
      {
        id: 'physical',
        label: '走って当たって、力強くたくましいチーム',
        weights: {
          vibe: { フィジカル: 3, スピード: 1, 力強さ: 1, 運動量: 1 },
        },
      },
      {
        id: 'fighter',
        label: '格上に食らいつく、ハングリーな挑戦者',
        weights: {
          tier: { underdog: 1, darkhorse: 1 },
          vibe: { 挑戦者: 2, 闘志: 2, 伏兵: 1 },
        },
      },
    ],
  },
  {
    id: 'second-country',
    question: '日本のほかにもう一国応援するなら？',
    options: [
      {
        id: 'strong-classic',
        label: '優勝候補の伝統国。優勝を一緒に目指したい',
        weights: {
          tier: { favorite: 2 },
          vibe: { 伝統国: 2, スター軍団: 1 },
        },
      },
      {
        id: 'rising',
        label: '勢いのある新興国。旋風を巻き起こすのを見たい',
        weights: {
          tier: { darkhorse: 2 },
          vibe: { のぼり調子: 2, 旋風: 1, 若さ: 1 },
        },
      },
      {
        id: 'underdog-story',
        label: '初出場や久々の出場国。物語を感じたい',
        weights: {
          tier: { underdog: 2 },
          vibe: { 初出場: 2, 挑戦者: 1 },
        },
      },
      {
        id: 'technical',
        label: '足元うまい技巧派。美しいサッカーが見たい',
        weights: {
          style: { attacking: 1 },
          vibe: { テクニック: 3, 個人技: 1, 華やか: 1 },
        },
      },
    ],
  },
  {
    id: 'match-mood',
    question: '観戦するとき、どんな気分で楽しみたい？',
    options: [
      {
        id: 'excited',
        label: 'ハラハラドキドキ、最後まで読めない展開',
        weights: {
          tier: { darkhorse: 1, underdog: 1 },
          vibe: { 粘り強さ: 1, 闘志: 1, 勝負強さ: 1 },
        },
      },
      {
        id: 'beautiful',
        label: 'ため息が出るような美しいプレーにうっとり',
        weights: {
          style: { attacking: 1 },
          vibe: { テクニック: 2, 華やか: 2, 個人技: 1 },
        },
      },
      {
        id: 'passionate',
        label: '熱気あふれるスタジアム、情熱的な応援',
        weights: {
          region: { south_america: 1 },
          vibe: { 情熱: 2, 陽気: 1, 闘志: 1 },
        },
      },
    ],
  },
]
