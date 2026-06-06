import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarDays } from 'lucide-react'
import { FeatureTile } from './FeatureTile'

describe('FeatureTile', () => {
  it('ラベルと説明が表示される', () => {
    render(
      <FeatureTile
        href="/matches"
        icon={CalendarDays}
        label="今日の試合"
        description="今日見るべき試合がわかる"
      />,
    )
    expect(screen.getByText('今日の試合')).toBeInTheDocument()
    expect(screen.getByText('今日見るべき試合がわかる')).toBeInTheDocument()
  })

  it('href のリンクになっている', () => {
    render(
      <FeatureTile
        href="/bracket"
        icon={CalendarDays}
        label="トーナメント表"
        description="優勝までの道のり"
      />,
    )
    const link = screen.getByRole('link', { name: /トーナメント表/ })
    expect(link).toHaveAttribute('href', '/bracket')
  })

  it('ラベルがリンクのアクセシブルネームに含まれる', () => {
    render(
      <FeatureTile
        href="/glossary"
        icon={CalendarDays}
        label="用語じてん"
        description="知らない言葉をその場で調べる"
        tone="gold"
      />,
    )
    expect(
      screen.getByRole('link', { name: /用語じてん/ }),
    ).toBeInTheDocument()
  })
})
