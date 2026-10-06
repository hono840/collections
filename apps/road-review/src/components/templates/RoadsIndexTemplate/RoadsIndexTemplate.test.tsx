import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoadsIndexTemplate } from './RoadsIndexTemplate'

// RoadsIndexTemplate (architecture 2.1, 9.5; UX 2.3). Server template, no data. Contract:
//   RoadsIndexTemplate({ actions: ReactNode; map?: ReactNode; list: ReactNode })
// Renders the page heading h1 "道の一覧", the actions slot, the list slot and (when given) the map slot.
// md+: list (2fr) left / map (3fr) right; the list is always present (map is supplementary).

describe('RoadsIndexTemplate', () => {
  it('renders the h1 "道の一覧"', () => {
    render(<RoadsIndexTemplate actions={null} list={<p>リスト</p>} />)
    expect(screen.getByRole('heading', { level: 1, name: '道の一覧' })).toBeInTheDocument()
  })

  it('renders actions, map and list slots', () => {
    render(
      <RoadsIndexTemplate
        actions={<a href="/roads/new">道を登録</a>}
        map={<div>地図スロット</div>}
        list={<ul aria-label="道のリスト"><li>碓氷峠</li></ul>}
      />,
    )
    expect(screen.getByRole('link', { name: '道を登録' })).toBeInTheDocument()
    expect(screen.getByText('地図スロット')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '道のリスト' })).toBeInTheDocument()
  })

  it('renders without a map slot', () => {
    render(<RoadsIndexTemplate actions={null} list={<p>リストだけ</p>} />)
    expect(screen.getByText('リストだけ')).toBeInTheDocument()
    expect(screen.queryByText('地図スロット')).not.toBeInTheDocument()
  })

  it('puts the list before the map in reading order (the list is the primary content)', () => {
    render(<RoadsIndexTemplate actions={null} map={<div>地図スロット</div>} list={<p>リスト</p>} />)
    const list = screen.getByText('リスト')
    const map = screen.getByText('地図スロット')
    expect(list.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
