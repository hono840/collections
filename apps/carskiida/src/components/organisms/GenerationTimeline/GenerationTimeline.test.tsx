import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerationTimeline } from './GenerationTimeline'
import type { Generation } from '@/types/car'

const generations: Generation[] = [
  { id: 'g4', ordinal: 4, code: 'ND', nameJa: '4代目 ND型', yearFrom: 2015, isCurated: true, grades: [], production: [] },
  { id: 'g3', ordinal: 3, code: 'NC', nameJa: '3代目 NC型', yearFrom: 2005, yearTo: 2015, isCurated: true, grades: [], production: [] },
]

describe('GenerationTimeline', () => {
  it('全世代のノードを表示する', () => {
    render(<GenerationTimeline generations={generations} activeId="g4" onSelect={() => {}} />)
    expect(screen.getByText('4代目 ND型')).toBeInTheDocument()
    expect(screen.getByText('3代目 NC型')).toBeInTheDocument()
  })

  it('アクティブな世代に aria-current が付く', () => {
    render(<GenerationTimeline generations={generations} activeId="g4" onSelect={() => {}} />)
    const active = screen.getByRole('button', { current: true })
    expect(active).toHaveTextContent('ND')
  })

  it('ノードをクリックすると onSelect が呼ばれる', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<GenerationTimeline generations={generations} activeId="g4" onSelect={onSelect} />)
    await user.click(screen.getByText('3代目 NC型'))
    expect(onSelect).toHaveBeenCalledWith('g3')
  })
})
