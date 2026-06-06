import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from './Tag'

describe('Tag', () => {
  it('children が正しく表示される', () => {
    render(<Tag>攻撃的</Tag>)
    expect(screen.getByText('攻撃的')).toBeInTheDocument()
  })

  it('枠線スタイル（border）が適用される', () => {
    render(<Tag>テスト</Tag>)
    expect(screen.getByText('テスト').className).toContain('border')
  })

  it('icon が指定された場合に表示される', () => {
    render(<Tag icon={<span data-testid="tag-icon">★</span>}>テスト</Tag>)
    expect(screen.getByTestId('tag-icon')).toBeInTheDocument()
  })

  it('icon が無い場合はアイコン枠が描画されない', () => {
    const { container } = render(<Tag>テスト</Tag>)
    expect(container.querySelector('[aria-hidden]')).toBeNull()
  })

  it('追加の className がマージされる', () => {
    render(<Tag className="mr-1">テスト</Tag>)
    expect(screen.getByText('テスト').className).toContain('mr-1')
  })
})
