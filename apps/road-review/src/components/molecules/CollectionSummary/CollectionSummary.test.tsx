import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CollectionSummary } from './CollectionSummary'

// CollectionSummary (PRD US-11 items 1-3; design spec 4-10; shown on /roads this sprint). Server molecule.
// Contract: CollectionSummary({ stats: CollectionStats; className? })
//   - a region (<section aria-labelledby>) with the h2 "走った道のコレクション"
//   - "走った道 N本"
//   - per-type counts for all 5 types in PRD order, 0 included: <ul aria-label="種別ごとの本数"> rows "峠 2本" ...
//   - "走った都道府県 N/47" + role="progressbar" named "走った都道府県 47のうちN" (aria-valuenow N, aria-valuemax 47)
//   - 0 driven roads -> E-06 "まだ走った道はありません。走行記録を追加するとここに数えられます" (no counts)
//   - no links, no ranking / comparison words

const stats = {
  drivenRoadCount: 2,
  byRoadType: { pass: 2, skyline: 0, coastal: 0, forest: 0, other: 0 },
  drivenPrefectureCount: 1,
  drivenRoadsByPrefecture: { 20: 2 },
}

const E06 = 'まだ走った道はありません。走行記録を追加するとここに数えられます'

describe('CollectionSummary', () => {
  it('is a region with the heading 走った道のコレクション', () => {
    render(<CollectionSummary stats={stats} />)
    expect(screen.getByRole('region', { name: '走った道のコレクション' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '走った道のコレクション' })).toBeInTheDocument()
  })

  it('PRD example: "走った道 2本"', () => {
    render(<CollectionSummary stats={stats} />)
    expect(screen.getByRole('region')).toHaveTextContent(/走った道\s*2\s*本/)
  })

  it('shows every type, 0 included, in PRD order: 峠 2本・スカイライン 0本・海岸線 0本・林道 0本・その他 0本', () => {
    render(<CollectionSummary stats={stats} />)
    const items = within(screen.getByRole('list', { name: '種別ごとの本数' })).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    const expected = [/峠\s*2\s*本/, /スカイライン\s*0\s*本/, /海岸線\s*0\s*本/, /林道\s*0\s*本/, /その他\s*0\s*本/]
    items.forEach((item, index) => expect(item).toHaveTextContent(expected[index]))
  })

  it('"走った都道府県 1/47" with a progress bar that reads the same', () => {
    render(<CollectionSummary stats={stats} />)
    expect(screen.getByRole('region')).toHaveTextContent(/走った都道府県\s*1\s*\/\s*47/)
    const bar = screen.getByRole('progressbar', { name: '走った都道府県 47のうち1' })
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '47')
  })

  it('0 driven roads -> E-06 and no counts', () => {
    render(
      <CollectionSummary
        stats={{
          drivenRoadCount: 0,
          byRoadType: { pass: 0, skyline: 0, coastal: 0, forest: 0, other: 0 },
          drivenPrefectureCount: 0,
          drivenRoadsByPrefecture: {},
        }}
      />,
    )
    expect(screen.getByText(E06)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('has no links and no ranking / comparison words (PRD US-11, US-14)', () => {
    const { container } = render(<CollectionSummary stats={stats} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.textContent ?? '').not.toMatch(/ランキング|順位|位|達成率|最速|他のユーザー/)
  })
})
