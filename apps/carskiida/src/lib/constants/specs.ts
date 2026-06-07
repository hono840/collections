import type { SpecKey, PartCategoryKey, BodyType } from '@/types/car'

/** 諸元キー → 日本語ラベル */
export const SPEC_LABELS: Record<SpecKey, string> = {
  length_mm: '全長',
  width_mm: '全幅',
  height_mm: '全高',
  wheelbase_mm: 'ホイールベース',
  weight_kg: '車両重量',
  displacement_cc: '排気量',
  power_kw: '最高出力',
  torque_nm: '最大トルク',
  fuel_km_l: '燃費',
  seating: '乗車定員',
}

/** 詳細・比較で表示する諸元の順序 */
export const SPEC_ORDER: SpecKey[] = [
  'length_mm',
  'width_mm',
  'height_mm',
  'wheelbase_mm',
  'weight_kg',
  'displacement_cc',
  'power_kw',
  'torque_nm',
  'fuel_km_l',
  'seating',
]

/** パーツカテゴリ → 日本語ラベル */
export const PART_CATEGORY_LABELS: Record<PartCategoryKey, string> = {
  engine: 'エンジン',
  drivetrain: '駆動方式',
  transmission: 'トランスミッション',
  suspension: 'サスペンション',
  brake: 'ブレーキ',
  body: 'ボディ構造',
  safety: '安全装備',
  wheel: 'ホイール・タイヤ',
}

/** パーツカテゴリの表示順 */
export const PART_CATEGORY_ORDER: PartCategoryKey[] = [
  'engine',
  'drivetrain',
  'transmission',
  'suspension',
  'brake',
  'body',
  'safety',
  'wheel',
]

/** ボディタイプ → 日本語ラベル */
export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: 'セダン',
  hatchback: 'ハッチバック',
  coupe: 'クーペ',
  wagon: 'ワゴン',
  suv: 'SUV',
  minivan: 'ミニバン',
  kei: '軽自動車',
  convertible: 'オープン / コンバーチブル',
  pickup: 'ピックアップ',
  other: 'その他',
}
