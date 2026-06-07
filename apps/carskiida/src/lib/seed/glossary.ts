import type { GlossaryTerm } from '@/types/car'

const editorSource = {
  type: 'editor' as const,
  label: 'carskiida 編集部',
  retrievedAt: '2026-06-07',
  confidence: 'high' as const,
}

/**
 * 用語集シード。初心者向けにスペック用語を簡潔に解説する。
 * Sprint 3 以降、term テーブル（Supabase）へ移行する。
 */
export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: 'torque',
    term: '最大トルク',
    reading: 'さいだいトルク',
    shortDef:
      'エンジンが生み出す「回転させる力」の最大値。数値が大きいほど発進や坂道で力強い。単位は N·m（kgf·m 併記）。',
    longDef:
      'トルクはタイヤを回そうとする力の強さを表す。馬力が「速さ・伸び」に効くのに対し、トルクは「出だしの力強さ・扱いやすさ」に効く。低い回転数から大きなトルクが出るエンジンは街乗りで運転しやすい。',
    source: editorSource,
  },
  {
    slug: 'power',
    term: '最高出力',
    reading: 'さいこうしゅつりょく',
    shortDef:
      'いわゆる「馬力」。エンジンが出せるパワーの最大値。単位は kW（PS 併記）。数値が大きいほど高速での伸びが良い。',
    longDef:
      '出力（パワー）はトルク × 回転数で決まる。最高速や高回転域での伸びに効く。kW（キロワット）が SI 単位で、日本では PS（馬力）が併記されることが多い（1 PS ≒ 0.7355 kW）。',
    source: editorSource,
  },
  {
    slug: 'wheelbase',
    term: 'ホイールベース',
    reading: 'ホイールベース',
    shortDef:
      '前輪の中心と後輪の中心の距離。長いほど直進安定性と室内空間に有利、短いほど小回りが利く。',
    longDef:
      'ホイールベースは車の運動性能を大きく左右する。長いと高速安定性・乗り心地・居住性に優れ、短いと取り回しや旋回の俊敏さに優れる。スポーツカーは適度に短く設定されることが多い。',
    source: editorSource,
  },
  {
    slug: 'displacement',
    term: '排気量',
    reading: 'はいきりょう',
    shortDef:
      'エンジンが一度に吸い込める混合気の量の合計。単位は cc（または L）。大きいほど一般にパワーを出しやすいが燃費・税金は不利。',
    longDef:
      '排気量はシリンダー容積の合計。日本では自動車税の区分にも使われる。近年は小排気量＋ターボで出力と燃費を両立する「ダウンサイジング」が主流。',
    source: editorSource,
  },
  {
    slug: 'kerb-weight',
    term: '車両重量',
    reading: 'しゃりょうじゅうりょう',
    shortDef:
      '燃料や規定の装備を含み、乗員・荷物を除いた車そのものの重さ。軽いほど加速・燃費・運動性に有利。',
    longDef:
      '車両重量は運動性能の土台。軽さは加速・制動・旋回・燃費すべてに効くため、ライトウェイトスポーツでは特に重視される。重量を出力で割った「パワーウェイトレシオ」も走りの指標になる。',
    source: editorSource,
  },
  {
    slug: 'drivetrain',
    term: '駆動方式',
    reading: 'くどうほうしき',
    shortDef:
      'エンジンの力をどの車輪に伝えるかの方式。FF / FR / MR / RR / AWD(4WD) などがある。',
    longDef:
      'FF=前輪駆動（広い室内・低コスト）、FR=後輪駆動（運動性・スポーツ向き）、MR/RR=ミッドシップ/リアエンジン（高い運動性）、AWD=全輪駆動（悪路・高い安定性）。重量配分やハンドリングの味付けに直結する。',
    source: editorSource,
  },
]
