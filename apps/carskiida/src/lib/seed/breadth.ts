import type { CarModel, Source } from '@/types/car'

/**
 * breadth（広さ）サンプル。
 * 本来は vPIC/Wikidata の自動 ETL で投入される母集団。MVP デモ用に少数を手置きする。
 * generations を持たず（depthLevel='breadth'）、ライト詳細テンプレで描画される。
 */

const vpicSource: Source = {
  type: 'vpic',
  label: 'NHTSA vPIC',
  url: 'https://vpic.nhtsa.dot.gov/api/',
  retrievedAt: '2026-06-07',
  confidence: 'low',
}

const wikidataSource: Source = {
  type: 'wikidata',
  label: 'Wikidata',
  url: 'https://www.wikidata.org/',
  retrievedAt: '2026-06-07',
  confidence: 'low',
}

function breadthModel(
  partial: Pick<
    CarModel,
    'id' | 'nameJa' | 'nameEn' | 'slug' | 'bodyType' | 'yearFrom' | 'summaryJa'
  > & { manufacturer: CarModel['manufacturer']; aliases?: string[]; completeness?: number }
): CarModel {
  return {
    originCountry: partial.manufacturer.country,
    aliases: partial.aliases ?? [],
    depthLevel: 'breadth',
    completeness: partial.completeness ?? 12,
    generations: [],
    fieldSources: {
      summary: wikidataSource,
      bodyType: vpicSource,
    },
    ...partial,
  }
}

const nissan = { id: 'nissan', nameJa: '日産', nameEn: 'Nissan', country: '日本' }
const honda = { id: 'honda', nameJa: 'ホンダ', nameEn: 'Honda', country: '日本' }
const toyota = { id: 'toyota', nameJa: 'トヨタ', nameEn: 'Toyota', country: '日本' }
const subaru = { id: 'subaru', nameJa: 'スバル', nameEn: 'Subaru', country: '日本' }

export const breadthModels: CarModel[] = [
  breadthModel({
    id: 'nissan-gtr',
    manufacturer: nissan,
    nameJa: 'GT-R',
    nameEn: 'GT-R',
    slug: 'gt-r',
    aliases: ['R35', 'スカイラインGT-R'],
    bodyType: 'coupe',
    yearFrom: 2007,
    summaryJa:
      '日産のフラッグシップスポーツ。栃木工場で匠（たくみ）がエンジンを手組みすることで知られる。',
    completeness: 18,
  }),
  breadthModel({
    id: 'honda-civic',
    manufacturer: honda,
    nameJa: 'シビック',
    nameEn: 'Civic',
    slug: 'civic',
    aliases: ['Type R', 'FL'],
    bodyType: 'hatchback',
    yearFrom: 1972,
    summaryJa: 'ホンダを代表するグローバルコンパクト。鈴鹿および海外複数拠点で生産。',
    completeness: 15,
  }),
  breadthModel({
    id: 'toyota-corolla',
    manufacturer: toyota,
    nameJa: 'カローラ',
    nameEn: 'Corolla',
    slug: 'corolla',
    aliases: ['Corolla'],
    bodyType: 'sedan',
    yearFrom: 1966,
    summaryJa: '世界累計販売台数で知られる定番セダン。世界各地の工場で生産される。',
    completeness: 14,
  }),
  breadthModel({
    id: 'subaru-wrx',
    manufacturer: subaru,
    nameJa: 'WRX',
    nameEn: 'WRX',
    slug: 'wrx',
    aliases: ['インプレッサWRX', 'VB'],
    bodyType: 'sedan',
    yearFrom: 1992,
    summaryJa: '水平対向エンジンとシンメトリカルAWDを核とするスポーツセダン。',
    completeness: 16,
  }),
  breadthModel({
    id: 'toyota-landcruiser',
    manufacturer: toyota,
    nameJa: 'ランドクルーザー',
    nameEn: 'Land Cruiser',
    slug: 'land-cruiser',
    aliases: ['ランクル', '300'],
    bodyType: 'suv',
    yearFrom: 1951,
    summaryJa: '長い歴史を持つ本格クロスカントリー4WD。',
    completeness: 13,
  }),
]
