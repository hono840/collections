import { describe, expect, it } from 'vitest'
import { ROAD_TYPES } from '@/lib/validation/road'
import { ROAD_TYPE_LABELS, ROAD_TYPE_OPTIONS } from './labels'

describe('road type labels', () => {
  it('maps every storage value to its Japanese label', () => {
    expect(ROAD_TYPE_LABELS).toEqual({
      pass: '峠',
      skyline: 'スカイライン',
      coastal: '海岸線',
      forest: '林道',
      other: 'その他',
    })
  })

  it('ROAD_TYPE_OPTIONS lists the 5 choices in the PRD order', () => {
    expect(ROAD_TYPE_OPTIONS).toEqual([
      { value: 'pass', label: '峠' },
      { value: 'skyline', label: 'スカイライン' },
      { value: 'coastal', label: '海岸線' },
      { value: 'forest', label: '林道' },
      { value: 'other', label: 'その他' },
    ])
  })

  it('stays in sync with the zod enum', () => {
    expect(ROAD_TYPE_OPTIONS.map((option) => option.value)).toEqual([...ROAD_TYPES])
  })

  it('contains no speed / racing words (PRD US-14)', () => {
    const banned = ['攻め', 'ワインディング', 'タイム', '最速', 'ランキング', '傾き']
    const allLabels = Object.values(ROAD_TYPE_LABELS).join(' ')
    for (const word of banned) expect(allLabels).not.toContain(word)
  })
})

// ---------------------------------------------------------------------------
// Sprint 3: drive / rating / road info labels (PRD 11, US-06, US-10; UX 6, M-35; design spec 4-2).
// Contract (src/lib/constants/labels.ts, added exports):
//   VEHICLE_TYPE_OPTIONS / WEATHER_OPTIONS / TRAFFIC_OPTIONS: ReadonlyArray<{ value; label }> (enum order)
//   VEHICLE_TYPE_LABELS / WEATHER_LABELS / TRAFFIC_LABELS: Record<value, label>
//   TRAFFIC_NOTE = M-35
//   RATING_AXIS_LABELS = { overall: '総合', scenery: '景観', roadSurface: '路面状態', easeOfDriving: '走りやすさ（道幅・見通し）' }
//   RATING_SCALE_LABELS: Record<RatingAxis, readonly [5 words]> (value 1..5 -> index 0..4)
//   ROAD_INFO_ITEM_LABELS: Record<RoadInfoItem, string>
//   PRESENCE_STATUS_LABELS = { yes: 'あり', no: 'なし', unknown: '不明' }
//   TOLL_STATUS_LABELS = { paid: '有料', free: '無料', unknown: '不明' }
//   NOT_RECORDED_LABEL = '記録しない' (input option), UNRECORDED_LABEL = '未記録' (M-26, display)
// ---------------------------------------------------------------------------

describe('drive labels (Sprint 3)', () => {
  it('vehicle types: 四輪 / 二輪', async () => {
    const { VEHICLE_TYPE_OPTIONS, VEHICLE_TYPE_LABELS } = await import('./labels')
    expect(VEHICLE_TYPE_OPTIONS).toEqual([
      { value: 'car', label: '四輪' },
      { value: 'motorcycle', label: '二輪' },
    ])
    expect(VEHICLE_TYPE_LABELS).toEqual({ car: '四輪', motorcycle: '二輪' })
  })

  it('weather: 晴 / 曇 / 雨 / 雪 / その他', async () => {
    const { WEATHER_OPTIONS, WEATHER_LABELS } = await import('./labels')
    expect(WEATHER_OPTIONS.map((option) => option.label)).toEqual(['晴', '曇', '雨', '雪', 'その他'])
    expect(WEATHER_OPTIONS.map((option) => option.value)).toEqual(['sunny', 'cloudy', 'rain', 'snow', 'other'])
    expect(WEATHER_LABELS.sunny).toBe('晴')
  })

  it('traffic: 少 / 普通 / 多 and the neutral note (M-35)', async () => {
    const { TRAFFIC_OPTIONS, TRAFFIC_LABELS, TRAFFIC_NOTE } = await import('./labels')
    expect(TRAFFIC_OPTIONS).toEqual([
      { value: 'few', label: '少' },
      { value: 'normal', label: '普通' },
      { value: 'many', label: '多' },
    ])
    expect(TRAFFIC_LABELS).toEqual({ few: '少', normal: '普通', many: '多' })
    expect(TRAFFIC_NOTE).toBe('その日の状況の記録です（良い・悪いの評価ではありません）')
  })

  it('rating axes', async () => {
    const { RATING_AXIS_LABELS } = await import('./labels')
    expect(RATING_AXIS_LABELS).toEqual({
      overall: '総合',
      scenery: '景観',
      roadSurface: '路面状態',
      easeOfDriving: '走りやすさ（道幅・見通し）',
    })
  })

  it('rating scale words (PRD 11-A)', async () => {
    const { RATING_SCALE_LABELS } = await import('./labels')
    expect(RATING_SCALE_LABELS.overall).toEqual(['いまひとつ', 'やや物足りない', 'ふつう', '良い', 'とても良い'])
    expect(RATING_SCALE_LABELS.scenery).toEqual(['いまひとつ', 'やや物足りない', 'ふつう', '良い', 'とても良い'])
    expect(RATING_SCALE_LABELS.roadSurface).toEqual(['荒れている', 'やや荒れ', 'ふつう', '良好', 'とても良好'])
    expect(RATING_SCALE_LABELS.easeOfDriving).toEqual([
      '走りにくい',
      'やや走りにくい',
      'ふつう',
      '走りやすい',
      'とても走りやすい',
    ])
  })

  it('road info items and statuses (PRD US-10)', async () => {
    const labels = await import('./labels')
    expect(labels.ROAD_INFO_ITEM_LABELS).toEqual({
      motorcycleBan: '二輪通行止め',
      nightClosure: '夜間通行止め',
      winterClosure: '冬季閉鎖',
      toll: '有料',
      parking: '駐車場',
      toilet: 'トイレ',
      michiNoEki: '道の駅',
      observatory: '展望台',
    })
    expect(labels.PRESENCE_STATUS_LABELS).toEqual({ yes: 'あり', no: 'なし', unknown: '不明' })
    expect(labels.TOLL_STATUS_LABELS).toEqual({ paid: '有料', free: '無料', unknown: '不明' })
    expect(labels.NOT_RECORDED_LABEL).toBe('記録しない')
    expect(labels.UNRECORDED_LABEL).toBe('未記録')
  })

  it('no speed / racing words in any label (PRD US-14)', async () => {
    const labels = await import('./labels')
    const banned = ['攻め', 'ワインディング', 'タイム', '最速', 'ランキング', '傾き', '速度', '飛ばせる']
    const allText = JSON.stringify(labels)
    for (const word of banned) expect(allText).not.toContain(word)
  })
})
