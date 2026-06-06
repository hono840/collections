import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeTemplate } from './HomeTemplate'

describe('HomeTemplate', () => {
  it('children が表示される', () => {
    render(
      <HomeTemplate>
        <p>セクション</p>
      </HomeTemplate>,
    )
    expect(screen.getByText('セクション')).toBeInTheDocument()
  })

  it('hero スロットが表示される', () => {
    render(
      <HomeTemplate hero={<div data-testid="hero-slot" />}>
        <p>本文</p>
      </HomeTemplate>,
    )
    expect(screen.getByTestId('hero-slot')).toBeInTheDocument()
  })

  it('hero が無い場合は hero セクションが描画されない', () => {
    const { container } = render(
      <HomeTemplate>
        <p>本文</p>
      </HomeTemplate>,
    )
    expect(container.querySelector('section')).toBeNull()
  })
})
