import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('AC17: renders its children inside the single main landmark', () => {
    render(
      <AppShell>
        <h1>ドライブスポット帳</h1>
        <button type="button">スポットを追加</button>
      </AppShell>,
    )

    const main = screen.getByRole('main')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(within(main).getByRole('heading', { name: 'ドライブスポット帳' })).toBeInTheDocument()
    expect(within(main).getByRole('button', { name: 'スポットを追加' })).toBeInTheDocument()
  })

  it('AC17: renders an empty main without children (while the saved data is loading)', () => {
    render(<AppShell />)

    const main = screen.getByRole('main')
    expect(main).toBeEmptyDOMElement()
  })

  it('holds no data or controls of its own', () => {
    render(<AppShell />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(document.body).toHaveTextContent(/^$/)
  })
})
