import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DefaultTemplate } from './DefaultTemplate'

describe('DefaultTemplate', () => {
  it('children が表示される', () => {
    render(
      <DefaultTemplate>
        <p>本文</p>
      </DefaultTemplate>,
    )
    expect(screen.getByText('本文')).toBeInTheDocument()
  })

  it('title が h1 として表示される', () => {
    render(<DefaultTemplate title="試合日程">本文</DefaultTemplate>)
    expect(
      screen.getByRole('heading', { level: 1, name: '試合日程' }),
    ).toBeInTheDocument()
  })

  it('title が無い場合は h1 が描画されない', () => {
    render(<DefaultTemplate>本文</DefaultTemplate>)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('description が表示される', () => {
    render(
      <DefaultTemplate title="日程" description="全104試合">
        本文
      </DefaultTemplate>,
    )
    expect(screen.getByText('全104試合')).toBeInTheDocument()
  })

  it('header スロットが表示される', () => {
    render(
      <DefaultTemplate header={<div data-testid="header-slot" />}>
        本文
      </DefaultTemplate>,
    )
    expect(screen.getByTestId('header-slot')).toBeInTheDocument()
  })

  it('bottomNav スロットが表示される', () => {
    render(
      <DefaultTemplate bottomNav={<div data-testid="nav-slot" />}>
        本文
      </DefaultTemplate>,
    )
    expect(screen.getByTestId('nav-slot')).toBeInTheDocument()
  })
})
