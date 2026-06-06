import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountryFlag } from './CountryFlag'

describe('CountryFlag', () => {
  it('国旗絵文字が表示される', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" />)
    expect(screen.getByText('🇯🇵')).toBeInTheDocument()
  })

  it('nameJa が aria-label として設定され role=img になる', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" />)
    expect(screen.getByRole('img', { name: '日本' })).toBeInTheDocument()
  })

  it('nameJa が無い場合は role=img にならない', () => {
    render(<CountryFlag flagEmoji="🇧🇷" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('デフォルトサイズ（md）が適用される', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" />)
    expect(screen.getByRole('img').className).toContain('text-3xl')
  })

  it('sm サイズが適用される', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" size="sm" />)
    expect(screen.getByRole('img').className).toContain('text-xl')
  })

  it('xl サイズが適用される', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" size="xl" />)
    expect(screen.getByRole('img').className).toContain('text-7xl')
  })

  it('追加の className がマージされる', () => {
    render(<CountryFlag flagEmoji="🇯🇵" nameJa="日本" className="mx-2" />)
    expect(screen.getByRole('img').className).toContain('mx-2')
  })
})
