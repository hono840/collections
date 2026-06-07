import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceBadge } from './SourceBadge'
import type { Source } from '@/types/car'

const base: Source = {
  type: 'manufacturer',
  label: 'マツダ公式',
  retrievedAt: '2026-06-07',
  confidence: 'high',
}

describe('SourceBadge', () => {
  it('出典種別に応じたラベルを表示する', () => {
    render(<SourceBadge source={{ ...base, type: 'manufacturer' }} />)
    expect(screen.getByText('OEM')).toBeInTheDocument()
  })

  it('vPIC を表示する', () => {
    render(<SourceBadge source={{ ...base, type: 'vpic' }} />)
    expect(screen.getByText('vPIC')).toBeInTheDocument()
  })

  it('url があれば外部リンク（新規タブ・nofollow）になる', () => {
    render(
      <SourceBadge source={{ ...base, url: 'https://example.com/spec' }} />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/spec')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('nofollow')
  })

  it('url が無ければリンクにならない', () => {
    render(<SourceBadge source={base} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('confidence=low は「要確認」をアクセシブルラベルに含める', () => {
    render(<SourceBadge source={{ ...base, confidence: 'low' }} />)
    expect(
      screen.getByLabelText(/要確認/)
    ).toBeInTheDocument()
  })

  it('UGC は破線枠スタイルになる', () => {
    render(<SourceBadge source={{ ...base, type: 'ugc' }} />)
    // 外側のバッジ要素（aria-label 付き）にスタイルが当たる
    expect(screen.getByLabelText(/出典: マツダ公式/).className).toContain(
      'border-dashed'
    )
  })
})
