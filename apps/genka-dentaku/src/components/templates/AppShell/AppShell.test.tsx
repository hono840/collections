import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the header, main content, nav, fab and overlay slots', () => {
    render(
      <AppShell
        header={<div>ヘッダー</div>}
        nav={<div>ナビ</div>}
        fab={<button type="button">＋新規メニュー</button>}
        overlay={<div>オーバーレイ</div>}
      >
        <div>メイン</div>
      </AppShell>,
    )
    expect(screen.getByText('ヘッダー')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('メイン')
    expect(screen.getByText('ナビ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '＋新規メニュー' })).toBeInTheDocument()
    expect(screen.getByText('オーバーレイ')).toBeInTheDocument()
  })

  it('omits the fab slot when not provided', () => {
    render(
      <AppShell header={<div>H</div>} nav={<div>N</div>}>
        <div>M</div>
      </AppShell>,
    )
    expect(screen.getByText('M')).toBeInTheDocument()
  })
})
