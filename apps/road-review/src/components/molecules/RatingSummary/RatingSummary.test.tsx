import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RatingSummary } from './RatingSummary'

// RatingSummary "評価のまとめ" on the road detail (PRD US-08 S2 aggregates; UX S-06). Server molecule.
// Contract: RatingSummary({ summary: DriveSummary /* summarizeDrives() result */; className? })
//   - <ul aria-label="評価のまとめ"> with 5 rows in order: 総合, 景観, 路面状態, 走りやすさ（道幅・見通し）, 交通量
//   - rating rows: "<axis> 4.0（3件の平均）"; no values -> "<axis> —" (no "件の平均")
//   - 総合 also has a RatingMeter named "総合評価 平均4.0"
//   - 交通量: "少 2・普通 1・多 0" (counts, never an average)

const summary = {
  overall: { average: 4, count: 3 },
  scenery: { average: 2, count: 1 },
  roadSurface: { average: null, count: 0 },
  easeOfDriving: { average: 3.7, count: 3 },
  traffic: { few: 2, normal: 1, many: 0 },
}

function rows() {
  return within(screen.getByRole('list', { name: '評価のまとめ' })).getAllByRole('listitem')
}

describe('RatingSummary', () => {
  it('lists the 5 axes in order', () => {
    render(<RatingSummary summary={summary} />)
    expect(rows().map((row) => row.textContent ?? '')).toEqual([
      expect.stringContaining('総合'),
      expect.stringContaining('景観'),
      expect.stringContaining('路面状態'),
      expect.stringContaining('走りやすさ（道幅・見通し）'),
      expect.stringContaining('交通量'),
    ])
  })

  it('PRD example: 総合 "4.0（3件の平均）", 景観 "2.0（1件の平均）"', () => {
    render(<RatingSummary summary={summary} />)
    expect(rows()[0]).toHaveTextContent('4.0（3件の平均）')
    expect(rows()[1]).toHaveTextContent('2.0（1件の平均）')
    expect(rows()[3]).toHaveTextContent('3.7（3件の平均）')
  })

  it('an axis without values shows "—" and no count', () => {
    render(<RatingSummary summary={summary} />)
    expect(rows()[2]).toHaveTextContent('—')
    expect(rows()[2]).not.toHaveTextContent('件の平均')
  })

  it('総合 has a meter named with the average', () => {
    render(<RatingSummary summary={summary} />)
    expect(screen.getByRole('img', { name: '総合評価 平均4.0' })).toBeInTheDocument()
  })

  it('交通量 is shown as counts: "少 2・普通 1・多 0"', () => {
    render(<RatingSummary summary={summary} />)
    expect(rows()[4]).toHaveTextContent('少 2・普通 1・多 0')
    expect(rows()[4]).not.toHaveTextContent('平均')
  })
})
