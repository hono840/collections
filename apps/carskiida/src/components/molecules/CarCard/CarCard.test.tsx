import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CarCard } from './CarCard'
import type { CarModelSummary } from '@/types/car'

const base: CarModelSummary = {
  id: 'mazda-roadster',
  manufacturerNameJa: 'マツダ',
  manufacturerSlug: 'mazda',
  nameJa: 'ロードスター',
  nameEn: 'Roadster',
  slug: 'roadster',
  bodyType: 'convertible',
  originCountry: '日本',
  yearFrom: 1989,
  depthLevel: 'showcase',
  completeness: 78,
}

describe('CarCard', () => {
  it('車名とメーカーを表示する', () => {
    render(<CarCard model={base} />)
    expect(screen.getByText('ロードスター')).toBeInTheDocument()
    expect(screen.getByText('マツダ')).toBeInTheDocument()
  })

  it('詳細ページへのリンクを持つ', () => {
    render(<CarCard model={base} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/cars/mazda/roadster'
    )
  })

  it('showcase には Showcase バッジが付く', () => {
    render(<CarCard model={base} />)
    expect(screen.getByText(/Showcase/)).toBeInTheDocument()
  })

  it('breadth には Showcase バッジが付かない', () => {
    render(<CarCard model={{ ...base, depthLevel: 'breadth' }} />)
    expect(screen.queryByText(/Showcase/)).not.toBeInTheDocument()
  })
})
