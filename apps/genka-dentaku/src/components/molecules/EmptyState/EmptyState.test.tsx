import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UtensilsCrossed } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Button } from '@/components/atoms/Button'

describe('EmptyState', () => {
  it('renders a heading, description and the CTA slot', () => {
    render(
      <EmptyState
        icon={UtensilsCrossed}
        title="まだメニューがありません"
        description="サンプルを入れて、価格を1つ変えてみましょう"
      >
        <Button>サンプルを入れて試す</Button>
      </EmptyState>,
    )
    expect(screen.getByRole('heading', { name: 'まだメニューがありません' })).toBeInTheDocument()
    expect(screen.getByText('サンプルを入れて、価格を1つ変えてみましょう')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'サンプルを入れて試す' })).toBeInTheDocument()
  })
})
