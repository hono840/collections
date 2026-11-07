import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoadDetailTemplate } from './RoadDetailTemplate'

// RoadDetailTemplate (architecture 2.1; UX 2.3 S-06 layout). Server template, no data.
// Contract:
//   RoadDetailTemplate({ header: ReactNode; notice?: ReactNode; ratings?: ReactNode; roadInfo: ReactNode;
//                        pins?: ReactNode; drives: ReactNode; actions?: ReactNode; dangerZone?: ReactNode })
//   - an <article> wrapping everything
//   - reading order (= 1 column order, UX 2.3): header -> notice -> ratings -> drives column ... with
//     roadInfo / pins in the side column on md+. DOM order: header, notice, ratings, roadInfo, pins, drives
//     NOTE: UX 2.3 lists 1-column order as 見出し → 林道の注意 → 評価のまとめ → 道の情報 → 地図 → 写真 → 走行記録.
//   - actions (e.g. the "走行記録を追加" link) come after drives; dangerZone last
//   - optional slots render nothing when omitted

function slot(name: string) {
  return <div data-testid={name}>{name}</div>
}

function order(...names: string[]) {
  const elements = names.map((name) => screen.getByTestId(name))
  for (let index = 1; index < elements.length; index += 1) {
    expect(
      elements[index - 1].compareDocumentPosition(elements[index]) & Node.DOCUMENT_POSITION_FOLLOWING,
      `${names[index - 1]} before ${names[index]}`,
    ).toBeTruthy()
  }
}

describe('RoadDetailTemplate', () => {
  it('wraps the slots in an article', () => {
    render(<RoadDetailTemplate header={slot('header')} roadInfo={slot('roadInfo')} drives={slot('drives')} />)
    expect(screen.getByRole('article')).toContainElement(screen.getByTestId('drives'))
  })

  it('keeps the UX reading order of the slots', () => {
    render(
      <RoadDetailTemplate
        header={slot('header')}
        notice={slot('notice')}
        ratings={slot('ratings')}
        roadInfo={slot('roadInfo')}
        pins={slot('pins')}
        drives={slot('drives')}
        actions={slot('actions')}
        dangerZone={slot('dangerZone')}
      />,
    )
    order('header', 'notice', 'ratings', 'roadInfo', 'pins', 'drives', 'actions', 'dangerZone')
  })

  it('renders without the optional slots', () => {
    const { container } = render(
      <RoadDetailTemplate header={slot('header')} roadInfo={slot('roadInfo')} drives={slot('drives')} />,
    )
    expect(screen.queryByTestId('notice')).not.toBeInTheDocument()
    expect(container.textContent).toBe('headerroadInfodrives')
  })
})
