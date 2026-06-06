import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListDetailTemplate } from './ListDetailTemplate'

describe('ListDetailTemplate', () => {
  it('children が表示される', () => {
    render(
      <ListDetailTemplate>
        <p>一覧</p>
      </ListDetailTemplate>,
    )
    expect(screen.getByText('一覧')).toBeInTheDocument()
  })

  it('title が h1 として表示される', () => {
    render(<ListDetailTemplate title="国図鑑">本文</ListDetailTemplate>)
    expect(
      screen.getByRole('heading', { level: 1, name: '国図鑑' }),
    ).toBeInTheDocument()
  })

  it('toolbar スロットが表示される', () => {
    render(
      <ListDetailTemplate toolbar={<div data-testid="toolbar-slot" />}>
        本文
      </ListDetailTemplate>,
    )
    expect(screen.getByTestId('toolbar-slot')).toBeInTheDocument()
  })

  it('toolbar が無い場合は sticky 枠が描画されない', () => {
    const { container } = render(
      <ListDetailTemplate>本文</ListDetailTemplate>,
    )
    expect(container.querySelector('.sticky')).toBeNull()
  })
})
