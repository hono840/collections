import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DriveList } from './DriveList'

// DriveList (architecture 2.1 / 11.5 US-07; PRD US-08). Server organism.
// Contract: DriveList({ roadId: string; drives: Drive[]; className? })
//   - <ul aria-label="走行記録"> of DriveCard, newest first: drivenOn desc, then createdAt desc
//     (sorted here too, so the order never depends on the caller)
//   - 0 drives -> E-03 "まだ走行記録がありません。ドライブのあと、落ち着いた場所で印象を書き残しましょう。"
//     with a "走行記録を追加" link to /roads/<roadId>/drives/new

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const E03 = 'まだ走行記録がありません。ドライブのあと、落ち着いた場所で印象を書き残しましょう。'

function drive(id: string, drivenOn: string, createdAt: string, memo: string) {
  return {
    id,
    roadId: ROAD_ID,
    drivenOn,
    vehicleType: null,
    weather: null,
    ratingOverall: 3,
    ratingScenery: null,
    ratingRoadSurface: null,
    ratingEaseOfDriving: null,
    traffic: null,
    memo,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('DriveList', () => {
  it('orders drives newest first by drive date, then by creation (US-07 / PRD US-08)', () => {
    const drives = [
      drive('00000000-0000-4000-8000-000000000001', '2026-05-03', '2026-05-03T01:00:00Z', 'GW'),
      drive('00000000-0000-4000-8000-000000000002', '2026-09-14', '2026-09-14T01:00:00Z', '同じ日・先に登録'),
      drive('00000000-0000-4000-8000-000000000003', '2025-11-20', '2025-11-20T01:00:00Z', '去年'),
      drive('00000000-0000-4000-8000-000000000004', '2026-09-14', '2026-09-14T05:00:00Z', '同じ日・後に登録'),
    ]

    render(<DriveList roadId={ROAD_ID} drives={drives} />)

    const items = within(screen.getByRole('list', { name: '走行記録' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent ?? '')).toEqual([
      expect.stringContaining('同じ日・後に登録'),
      expect.stringContaining('同じ日・先に登録'),
      expect.stringContaining('GW'),
      expect.stringContaining('去年'),
    ])
  })

  it('does not mutate the drives prop', () => {
    const drives = [
      drive('00000000-0000-4000-8000-000000000001', '2026-05-03', '2026-05-03T01:00:00Z', 'a'),
      drive('00000000-0000-4000-8000-000000000002', '2026-09-14', '2026-09-14T01:00:00Z', 'b'),
    ]
    render(<DriveList roadId={ROAD_ID} drives={drives} />)
    expect(drives.map((item) => item.memo)).toEqual(['a', 'b'])
  })

  it('every card links to its own edit page', () => {
    const drives = [drive('00000000-0000-4000-8000-000000000009', '2026-09-14', '2026-09-14T01:00:00Z', 'x')]
    render(<DriveList roadId={ROAD_ID} drives={drives} />)
    expect(screen.getByRole('link', { name: /編集/ })).toHaveAttribute(
      'href',
      `/roads/${ROAD_ID}/drives/00000000-0000-4000-8000-000000000009/edit`,
    )
  })

  it('0 drives -> E-03 and a 走行記録を追加 link', () => {
    render(<DriveList roadId={ROAD_ID} drives={[]} />)
    expect(screen.getByText(E03)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '走行記録を追加' })).toHaveAttribute('href', `/roads/${ROAD_ID}/drives/new`)
    expect(screen.queryByRole('list', { name: '走行記録' })).not.toBeInTheDocument()
  })
})
