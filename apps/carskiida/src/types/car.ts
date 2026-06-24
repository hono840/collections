/**
 * carskiida ドメインモデル
 *
 * 設計の核:
 * - breadth（自動収録の母集団）と depth（手厚いショーケース）は同一 CarModel を基底に、
 *   `depthLevel` と拡張データ（generations 等）の有無で表現する。
 * - 全データフィールドに出典(Source)を持たせる（field_sources マップ）。
 */

// ============================================================
// 出典（Source）
// ============================================================

export type SourceType =
  | 'vpic'
  | 'wikidata'
  | 'wikipedia'
  | 'manufacturer'
  | 'ugc'
  | 'editor'

export type Confidence = 'high' | 'medium' | 'low'

export interface Source {
  type: SourceType
  /** 表示名（例: "NHTSA vPIC", "日産公式諸元表(2024)"） */
  label: string
  /** 出典 URL（あれば） */
  url?: string
  /** ISO8601 取得/転記日時 */
  retrievedAt: string
  confidence: Confidence
  note?: string
}

/** フィールド名 → 出典 のマップ。値の無いフィールドには出典も無い＝「出典未確認」 */
export type FieldSources = Record<string, Source>

// ============================================================
// 列挙
// ============================================================

export type DepthLevel = 'breadth' | 'showcase'

export type BodyType =
  | 'sedan'
  | 'hatchback'
  | 'coupe'
  | 'wagon'
  | 'suv'
  | 'minivan'
  | 'kei'
  | 'convertible'
  | 'pickup'
  | 'other'

export type Drivetrain = 'FF' | 'FR' | 'MR' | 'RR' | 'AWD' | '4WD'

export type PartCategoryKey =
  | 'engine'
  | 'drivetrain'
  | 'transmission'
  | 'suspension'
  | 'brake'
  | 'body'
  | 'safety'
  | 'wheel'

/** 比較で正規化する諸元キー */
export type SpecKey =
  | 'length_mm'
  | 'width_mm'
  | 'height_mm'
  | 'wheelbase_mm'
  | 'weight_kg'
  | 'displacement_cc'
  | 'power_kw'
  | 'torque_nm'
  | 'fuel_km_l'
  | 'seating'

// ============================================================
// エンティティ
// ============================================================

export interface Manufacturer {
  id: string
  nameJa: string
  nameEn: string
  country: string
  fieldSources?: FieldSources
}

export interface Plant {
  id: string
  name: string
  country: string
  region?: string
  lat?: number
  lng?: number
  fieldSources?: FieldSources
}

/** 世代/グレード × 工場（生産地の変遷） */
export interface ProductionAssignment {
  plant: Plant
  yearFrom?: number
  yearTo?: number
  source: Source
}

/** 諸元の 1 項目（正規化値と表示文字列を分離して保持） */
export interface SpecValue {
  key: SpecKey
  /** 比較用に正規化した数値（SI 等） */
  valueNormalized: number
  /** 表示文字列（"152kW(207PS)" のような併記を許容） */
  valueDisplay: string
  unit: string
  source: Source
  confidence: Confidence
}

export interface Engine {
  id: string
  code?: string
  displacementCc?: number
  cylinders?: number
  aspiration?: 'NA' | 'turbo' | 'supercharged' | 'twincharged'
  fuelType?: string
  maxPowerPs?: number
  maxTorqueNm?: number
  fieldSources?: FieldSources
}

export interface Part {
  id: string
  category: PartCategoryKey
  nameJa: string
  nameEn?: string
  /** 形式の要約（例: "ダブルウィッシュボーン"） */
  specSummary?: string
  detailMd?: string
  source: Source
}

export interface Grade {
  id: string
  name: string
  drivetrain?: Drivetrain
  transmission?: string
  specs: SpecValue[]
  parts: Part[]
  fieldSources?: FieldSources
}

export interface Generation {
  id: string
  /** 通称世代番号（1 = 初代） */
  ordinal: number
  /** 型式/世代コード（例: "R35", "ZN8"） */
  code?: string
  nameJa?: string
  yearFrom: number
  yearTo?: number
  /** 世代史ナラティブ（Markdown） */
  narrativeMd?: string
  /** この世代を作り込み済みか（未作り込みは「準備中」表示） */
  isCurated: boolean
  grades: Grade[]
  production: ProductionAssignment[]
  fieldSources?: FieldSources
}

export interface CarModel {
  id: string
  manufacturer: Manufacturer
  nameJa: string
  nameEn: string
  /** URL スラッグ（manufacturer slug 配下で一意） */
  slug: string
  /** 別名/通称（検索用） */
  aliases: string[]
  bodyType: BodyType
  originCountry: string
  yearFrom: number
  yearTo?: number
  summaryJa?: string
  depthLevel: DepthLevel
  /** 充足度 0-100（埋まったフィールド率、ETL が算出） */
  completeness: number
  /** depth(showcase) のみ。breadth は空配列 */
  generations: Generation[]
  fieldSources?: FieldSources
}

/** 一覧/検索カード用の軽量表現 */
export interface CarModelSummary {
  id: string
  manufacturerNameJa: string
  manufacturerSlug: string
  nameJa: string
  nameEn: string
  slug: string
  bodyType: BodyType
  originCountry: string
  yearFrom: number
  yearTo?: number
  depthLevel: DepthLevel
  completeness: number
}

// ============================================================
// 用語集
// ============================================================

export interface GlossaryTerm {
  slug: string
  term: string
  reading: string
  shortDef: string
  longDef?: string
  source?: Source
}
