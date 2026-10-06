import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoadNotFound from './not-found'

// S-12 / M-24: the same 404 for a missing id and another user's id.
describe('/roads/[roadId] not-found', () => {
  it('shows M-24, the hint and a link back to the list', () => {
    render(<RoadNotFound />)
    expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument()
    expect(screen.getByText('削除されたか、URLが間違っている可能性があります')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '道の一覧へ' })).toHaveAttribute('href', '/roads')
  })
})
