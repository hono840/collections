import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('children が正しく表示される', () => {
    render(<Badge>NEW</Badge>)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('デフォルト variant (neutral) のスタイルが適用される', () => {
    render(<Badge>テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('text-text-muted')
  })

  it('pitch variant のスタイルが適用される', () => {
    render(<Badge variant="pitch">テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('bg-pitch-100')
  })

  it('gold variant のスタイルが適用される', () => {
    render(<Badge variant="gold">テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('bg-gold-100')
  })

  it('kickoff variant のスタイルが適用される', () => {
    render(<Badge variant="kickoff">テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('bg-kickoff-100')
  })

  it('丸み（rounded-full）が常に付与される', () => {
    render(<Badge>テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('rounded-full')
  })

  it('追加の className がマージされる', () => {
    render(<Badge className="ml-2">テスト</Badge>)
    expect(screen.getByText('テスト').className).toContain('ml-2')
  })
})
