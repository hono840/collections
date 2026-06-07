import type { CarModel, Source } from '@/types/car'

/**
 * ショーケース車種シード: マツダ・ロードスター（ND 現行 + NC 先代）
 *
 * 出典方針: 数値諸元はメーカー公式諸元/Wikipedia の事実値を転記（confidence は medium 基準）。
 * 本データは縦切り MVP のデモ用シード。Sprint 3 以降は ETL + Supabase へ移行する。
 * 値は代表グレードの公表値に基づく概算（厳密版は depth 化フローで source を確定する）。
 */

const mfrSource: Source = {
  type: 'manufacturer',
  label: 'マツダ公式 車種ページ',
  url: 'https://www.mazda.co.jp/cars/roadster/',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

const wikiSource: Source = {
  type: 'wikipedia',
  label: 'マツダ・ロードスター - Wikipedia',
  url: 'https://ja.wikipedia.org/wiki/%E3%83%9E%E3%83%84%E3%83%80%E3%83%BB%E3%83%AD%E3%83%BC%E3%83%89%E3%82%B9%E3%82%BF%E3%83%BC',
  retrievedAt: '2026-06-07',
  confidence: 'medium',
}

const ujinaPlant = {
  id: 'plant-mazda-ujina-1',
  name: 'マツダ 宇品第1工場',
  country: '日本',
  region: '広島県広島市',
  lat: 34.3636,
  lng: 132.4783,
}

export const roadster: CarModel = {
  id: 'mazda-roadster',
  manufacturer: {
    id: 'mazda',
    nameJa: 'マツダ',
    nameEn: 'Mazda',
    country: '日本',
  },
  nameJa: 'ロードスター',
  nameEn: 'Roadster',
  slug: 'roadster',
  aliases: ['MX-5', 'Miata', 'ユーノスロードスター', 'eunos'],
  bodyType: 'convertible',
  originCountry: '日本',
  yearFrom: 1989,
  summaryJa:
    '1989年に初代が登場した、軽量・後輪駆動・オープン2シーターを貫くライトウェイトスポーツ。' +
    '「人馬一体」を設計思想に掲げ、歴代を通じて広島・宇品工場で生産される。',
  depthLevel: 'showcase',
  completeness: 78,
  generations: [
    // --- 現行: ND型 ---
    {
      id: 'roadster-nd',
      ordinal: 4,
      code: 'ND',
      nameJa: '4代目 ND型',
      yearFrom: 2015,
      isCurated: true,
      narrativeMd:
        '4代目NDは「原点回帰」を掲げ、先代NCで増した車格と重量を初代相当まで引き戻した世代。' +
        '排気量を2.0Lから1.5L（SKYACTIV-G 1.5）へ小排気量化し、約1tの軽量ボディと相まって' +
        '俊敏なハンドリングを取り戻した。後に2.0Lの「RF（リトラクタブルファストバック）」も追加。',
      production: [
        {
          plant: ujinaPlant,
          yearFrom: 2015,
          source: wikiSource,
        },
      ],
      grades: [
        {
          id: 'roadster-nd-s',
          name: 'S (6MT)',
          drivetrain: 'FR',
          transmission: '6速MT',
          specs: [
            { key: 'length_mm', valueNormalized: 3915, valueDisplay: '3,915 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'width_mm', valueNormalized: 1735, valueDisplay: '1,735 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'height_mm', valueNormalized: 1235, valueDisplay: '1,235 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'wheelbase_mm', valueNormalized: 2310, valueDisplay: '2,310 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'weight_kg', valueNormalized: 990, valueDisplay: '990 kg', unit: 'kg', source: mfrSource, confidence: 'medium' },
            { key: 'displacement_cc', valueNormalized: 1496, valueDisplay: '1,496 cc', unit: 'cc', source: mfrSource, confidence: 'high' },
            { key: 'power_kw', valueNormalized: 97, valueDisplay: '97 kW (132 PS)', unit: 'kW', source: mfrSource, confidence: 'medium' },
            { key: 'torque_nm', valueNormalized: 152, valueDisplay: '152 N·m (15.5 kgf·m)', unit: 'N·m', source: mfrSource, confidence: 'medium' },
            { key: 'fuel_km_l', valueNormalized: 16.8, valueDisplay: '16.8 km/L (WLTC)', unit: 'km/L', source: mfrSource, confidence: 'low' },
            { key: 'seating', valueNormalized: 2, valueDisplay: '2 名', unit: '名', source: mfrSource, confidence: 'high' },
          ],
          parts: [
            { id: 'nd-eng', category: 'engine', nameJa: '直列4気筒 SKYACTIV-G 1.5', specSummary: 'P5-VP型 / 自然吸気 / 1,496cc', source: mfrSource },
            { id: 'nd-dt', category: 'drivetrain', nameJa: '後輪駆動 (FR)', specSummary: 'フロントエンジン・リアドライブ', source: mfrSource },
            { id: 'nd-tr', category: 'transmission', nameJa: '6速マニュアル', specSummary: 'ショートストローク MT', source: mfrSource },
            { id: 'nd-sus-f', category: 'suspension', nameJa: 'フロント: ダブルウィッシュボーン', specSummary: '独立懸架', source: wikiSource },
            { id: 'nd-sus-r', category: 'suspension', nameJa: 'リア: マルチリンク', specSummary: '独立懸架', source: wikiSource },
            { id: 'nd-brk', category: 'brake', nameJa: 'ベンチレーテッドディスク (前) / ディスク (後)', source: wikiSource },
            { id: 'nd-safety', category: 'safety', nameJa: 'i-ACTIVSENSE', specSummary: '先進安全技術パッケージ', source: mfrSource },
          ],
        },
        {
          id: 'roadster-nd-rs',
          name: 'RS (6MT)',
          drivetrain: 'FR',
          transmission: '6速MT',
          specs: [
            { key: 'length_mm', valueNormalized: 3915, valueDisplay: '3,915 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'width_mm', valueNormalized: 1735, valueDisplay: '1,735 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'height_mm', valueNormalized: 1235, valueDisplay: '1,235 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'wheelbase_mm', valueNormalized: 2310, valueDisplay: '2,310 mm', unit: 'mm', source: mfrSource, confidence: 'medium' },
            { key: 'weight_kg', valueNormalized: 1060, valueDisplay: '1,060 kg', unit: 'kg', source: mfrSource, confidence: 'medium' },
            { key: 'displacement_cc', valueNormalized: 1496, valueDisplay: '1,496 cc', unit: 'cc', source: mfrSource, confidence: 'high' },
            { key: 'power_kw', valueNormalized: 97, valueDisplay: '97 kW (132 PS)', unit: 'kW', source: mfrSource, confidence: 'medium' },
            { key: 'torque_nm', valueNormalized: 152, valueDisplay: '152 N·m (15.5 kgf·m)', unit: 'N·m', source: mfrSource, confidence: 'medium' },
            { key: 'fuel_km_l', valueNormalized: 16.8, valueDisplay: '16.8 km/L (WLTC)', unit: 'km/L', source: mfrSource, confidence: 'low' },
            { key: 'seating', valueNormalized: 2, valueDisplay: '2 名', unit: '名', source: mfrSource, confidence: 'high' },
          ],
          parts: [
            { id: 'nd-rs-eng', category: 'engine', nameJa: '直列4気筒 SKYACTIV-G 1.5', specSummary: 'P5-VP型 / 自然吸気 / 1,496cc', source: mfrSource },
            { id: 'nd-rs-dt', category: 'drivetrain', nameJa: '後輪駆動 (FR)', source: mfrSource },
            { id: 'nd-rs-sus', category: 'suspension', nameJa: 'ビルシュタイン製ダンパー', specSummary: 'RS専用チューニング', source: wikiSource },
            { id: 'nd-rs-body', category: 'body', nameJa: 'フロントサスタワーバー', specSummary: 'ボディ剛性強化', source: wikiSource },
            { id: 'nd-rs-brk', category: 'brake', nameJa: 'ベンチレーテッドディスク (前) / ディスク (後)', source: wikiSource },
          ],
        },
      ],
    },
    // --- 先代: NC型 ---
    {
      id: 'roadster-nc',
      ordinal: 3,
      code: 'NC',
      nameJa: '3代目 NC型',
      yearFrom: 2005,
      yearTo: 2015,
      isCurated: true,
      narrativeMd:
        '3代目NCは歴代で最も大柄になった世代。排気量を2.0Lに拡大し、電動格納式ハードトップ' +
        '「ロードスター クーペ（RHT）」を初設定した。安全基準・快適性を重視し車格が上がった一方、' +
        '車重も増加。この反動が次代NDの「原点回帰」へとつながった。',
      production: [
        {
          plant: ujinaPlant,
          yearFrom: 2005,
          yearTo: 2015,
          source: wikiSource,
        },
      ],
      grades: [
        {
          id: 'roadster-nc-rs',
          name: 'RS (6MT)',
          drivetrain: 'FR',
          transmission: '6速MT',
          specs: [
            { key: 'length_mm', valueNormalized: 4020, valueDisplay: '4,020 mm', unit: 'mm', source: wikiSource, confidence: 'medium' },
            { key: 'width_mm', valueNormalized: 1720, valueDisplay: '1,720 mm', unit: 'mm', source: wikiSource, confidence: 'medium' },
            { key: 'height_mm', valueNormalized: 1245, valueDisplay: '1,245 mm', unit: 'mm', source: wikiSource, confidence: 'medium' },
            { key: 'wheelbase_mm', valueNormalized: 2330, valueDisplay: '2,330 mm', unit: 'mm', source: wikiSource, confidence: 'medium' },
            { key: 'weight_kg', valueNormalized: 1110, valueDisplay: '1,110 kg', unit: 'kg', source: wikiSource, confidence: 'medium' },
            { key: 'displacement_cc', valueNormalized: 1998, valueDisplay: '1,998 cc', unit: 'cc', source: wikiSource, confidence: 'high' },
            { key: 'power_kw', valueNormalized: 125, valueDisplay: '125 kW (170 PS)', unit: 'kW', source: wikiSource, confidence: 'medium' },
            { key: 'torque_nm', valueNormalized: 188, valueDisplay: '188 N·m (19.2 kgf·m)', unit: 'N·m', source: wikiSource, confidence: 'medium' },
            { key: 'fuel_km_l', valueNormalized: 13.4, valueDisplay: '13.4 km/L (10·15)', unit: 'km/L', source: wikiSource, confidence: 'low' },
            { key: 'seating', valueNormalized: 2, valueDisplay: '2 名', unit: '名', source: wikiSource, confidence: 'high' },
          ],
          parts: [
            { id: 'nc-eng', category: 'engine', nameJa: '直列4気筒 MZR LF-VE 2.0', specSummary: 'LF-VE型 / 自然吸気 / 1,998cc', source: wikiSource },
            { id: 'nc-dt', category: 'drivetrain', nameJa: '後輪駆動 (FR)', source: wikiSource },
            { id: 'nc-tr', category: 'transmission', nameJa: '6速マニュアル', source: wikiSource },
            { id: 'nc-sus-f', category: 'suspension', nameJa: 'フロント: ダブルウィッシュボーン', specSummary: '独立懸架', source: wikiSource },
            { id: 'nc-sus-r', category: 'suspension', nameJa: 'リア: マルチリンク', specSummary: '独立懸架', source: wikiSource },
            { id: 'nc-body', category: 'body', nameJa: '電動格納式ハードトップ (RHT)', specSummary: 'パワーリトラクタブルハードトップ', source: wikiSource },
            { id: 'nc-brk', category: 'brake', nameJa: 'ベンチレーテッドディスク (前) / ディスク (後)', source: wikiSource },
          ],
        },
      ],
    },
  ],
}
