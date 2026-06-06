import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Score } from './Score'

describe('Score', () => {
  it('両得点が確定している場合にスコアが表示される', () => {
    render(<Score home={2} away={1} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('確定スコアは aria-label に「2 対 1」が設定される', () => {
    render(<Score home={2} away={1} />)
    expect(screen.getByRole('img', { name: '2 対 1' })).toBeInTheDocument()
  })

  it('0-0 のスコアも正しく表示される', () => {
    render(<Score home={0} away={0} />)
    expect(screen.getByRole('img', { name: '0 対 0' })).toBeInTheDocument()
  })

  it('未実施（null）の場合は試合前ラベルになる', () => {
    render(<Score home={null} away={null} />)
    expect(screen.getByRole('img', { name: '試合前' })).toBeInTheDocument()
  })

  it('片方のみ未確定の場合も試合前扱いになる', () => {
    render(<Score home={2} away={null} />)
    expect(screen.getByRole('img', { name: '試合前' })).toBeInTheDocument()
  })

  it('lg サイズが適用される', () => {
    render(<Score home={1} away={0} size="lg" />)
    expect(screen.getByRole('img').className).toContain('text-3xl')
  })
})
