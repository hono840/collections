import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanFeatureRow } from './PlanFeatureRow'

describe('PlanFeatureRow', () => {
  it('renders string cells as text', () => {
    render(<PlanFeatureRow feature="メニュー登録" free="3件まで" pro="無制限" />)
    expect(screen.getByText('メニュー登録')).toBeInTheDocument()
    expect(screen.getByText('3件まで')).toBeInTheDocument()
    expect(screen.getByText('無制限')).toBeInTheDocument()
  })

  it('renders accessible 対応 / 非対応 marks for boolean cells', () => {
    render(<PlanFeatureRow feature="PDF / CSV 出力" free={false} pro />)
    expect(screen.getByRole('img', { name: '対応' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '非対応' })).toBeInTheDocument()
  })
})
