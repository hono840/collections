import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RoadInfoSummary } from './RoadInfoSummary'

// RoadInfoSummary (architecture 2.1 / 11.5 US-04; PRD US-10 display; UX 3.1 S-06; design spec 4-6 RoadInfoCard).
// Server molecule. Contract:
//   RoadInfoSummary({ info: LatestRoadInfo; today?: string /* defaults to todayInTokyo() */; className? })
//   - a region (<section aria-labelledby>) named "道の情報" with the "ユーザー記録" label and M-06, always
//   - lists named "通行ルール" (二輪通行止め / 夜間通行止め / 冬季閉鎖 / 有料) and "施設" (駐車場 / トイレ / 道の駅 / 展望台)
//   - recorded item row text: "<item> <value>（<memo>）・確認日 YYYY-MM-DD"; without memo "<value>・確認日 YYYY-MM-DD"
//     (PRD copy; values あり / なし / 不明, toll 有料 / 無料 / 不明)
//   - unrecorded item: "未記録" (M-26), no 確認日
//   - per item, confirmed 366+ days before today: "確認から1年以上たっています" + sr-only
//     "最新の情報ではない可能性があります。" (M-07)
//   - all 8 unrecorded: E-05 "まだ道の情報が記録されていません。通行止めや駐車場などを確認したら、記録しておきましょう。"
//     (the M-06 note stays)

const M06 = 'これはあなた自身の記録で、公式情報ではありません。お出かけ前に道路管理者の公式情報を確認してください。'
const E05 = 'まだ道の情報が記録されていません。通行止めや駐車場などを確認したら、記録しておきましょう。'
const STALE = '確認から1年以上たっています'

const emptyInfo = {
  motorcycleBan: null,
  nightClosure: null,
  winterClosure: null,
  toll: null,
  parking: null,
  toilet: null,
  michiNoEki: null,
  observatory: null,
}

const info = {
  ...emptyInfo,
  motorcycleBan: { status: 'yes' as const, memo: '土日のみ', confirmedOn: '2026-10-01' },
  nightClosure: { status: 'no' as const, memo: '', confirmedOn: '2026-10-01' },
  toll: { status: 'free' as const, memo: '', confirmedOn: '2026-09-12' },
  parking: { status: 'yes' as const, memo: '', confirmedOn: '2025-10-06' }, // 365 days -> not stale
  toilet: { status: 'unknown' as const, memo: '', confirmedOn: '2025-10-05' }, // 366 days -> stale
}

function rows(listName: '通行ルール' | '施設') {
  return within(screen.getByRole('list', { name: listName })).getAllByRole('listitem')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('RoadInfoSummary', () => {
  it('is a region named 道の情報 with the ユーザー記録 label and the M-06 note', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    const region = screen.getByRole('region', { name: /道の情報/ })
    expect(within(region).getByText('ユーザー記録')).toBeInTheDocument()
    expect(within(region).getByText(M06)).toBeInTheDocument()
  })

  it('lists the 4 rules and the 4 facilities in PRD order', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    const ruleRows = rows('通行ルール')
    const facilityRows = rows('施設')
    expect(ruleRows).toHaveLength(4)
    expect(facilityRows).toHaveLength(4)
    expect(ruleRows.map((row) => row.textContent ?? '')).toEqual([
      expect.stringContaining('二輪通行止め'),
      expect.stringContaining('夜間通行止め'),
      expect.stringContaining('冬季閉鎖'),
      expect.stringContaining('有料'),
    ])
    expect(facilityRows.map((row) => row.textContent ?? '')).toEqual([
      expect.stringContaining('駐車場'),
      expect.stringContaining('トイレ'),
      expect.stringContaining('道の駅'),
      expect.stringContaining('展望台'),
    ])
  })

  it('PRD example: "あり（土日のみ）・確認日 2026-10-01"; without memo "なし・確認日 2026-10-01"', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    const [motorcycleBan, nightClosure] = rows('通行ルール')
    expect(motorcycleBan).toHaveTextContent('あり（土日のみ）・確認日 2026-10-01')
    expect(nightClosure).toHaveTextContent('なし・確認日 2026-10-01')
  })

  it('toll uses 無料; 不明 is shown as a value, distinct from 未記録', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    expect(rows('通行ルール')[3]).toHaveTextContent('無料・確認日 2026-09-12')
    expect(rows('施設')[1]).toHaveTextContent('不明・確認日 2025-10-05')
  })

  it('unrecorded items say 未記録 without a date', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    const winterClosure = rows('通行ルール')[2]
    expect(winterClosure).toHaveTextContent('未記録')
    expect(winterClosure).not.toHaveTextContent('確認日')
  })

  it('PRD boundary (today 2026-10-06): トイレ 2025-10-05 is stale, 駐車場 2025-10-06 is not', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    const [parking, toilet] = rows('施設')
    expect(toilet).toHaveTextContent(STALE)
    expect(toilet).toHaveTextContent('最新の情報ではない可能性があります。')
    expect(parking).not.toHaveTextContent(STALE)
    expect(screen.getAllByText(new RegExp(STALE))).toHaveLength(1)
  })

  it('defaults "today" to the JST date', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-05T15:00:00Z')) // 2026-10-06 00:00 JST
    render(<RoadInfoSummary info={info} />)
    expect(screen.getAllByText(new RegExp(STALE))).toHaveLength(1)
  })

  it('all 8 unrecorded -> E-05 empty state, and the M-06 note is still shown', () => {
    render(<RoadInfoSummary info={emptyInfo} today="2026-10-06" />)
    expect(screen.getByText(E05)).toBeInTheDocument()
    expect(screen.getByText(M06)).toBeInTheDocument()
    expect(screen.getByText('ユーザー記録')).toBeInTheDocument()
  })

  it('escapes memos and never prints null / undefined', () => {
    const { container } = render(
      <RoadInfoSummary
        info={{ ...info, parking: { status: 'yes', memo: '<b>約20台</b>', confirmedOn: '2026-10-01' } }}
        today="2026-10-06"
      />,
    )
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<b>約20台</b>')
    expect(container.textContent ?? '').not.toMatch(/null|undefined|NaN/)
  })

  it('values are words, never colour only (no "あり" row without text)', () => {
    render(<RoadInfoSummary info={info} today="2026-10-06" />)
    for (const row of [...rows('通行ルール'), ...rows('施設')]) {
      expect(row.textContent ?? '').toMatch(/あり|なし|不明|有料|無料|未記録/)
    }
  })
})
