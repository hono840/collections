import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GlossaryList } from './GlossaryList'
import type { Term } from '@/lib/domain'

const terms: Term[] = [
  {
    slug: 'offside',
    termJa: 'オフサイド',
    reading: 'おふさいど',
    definitionJa: '攻撃側の反則のひとつ。',
    category: 'rule',
  },
  {
    slug: 'striker',
    termJa: 'ストライカー',
    reading: 'すとらいかー',
    definitionJa: '点を取る役割の選手。',
    category: 'position',
  },
  {
    slug: 'hattrick',
    termJa: 'ハットトリック',
    definitionJa: '1試合で3得点すること。',
    category: 'stat',
  },
]

describe('GlossaryList', () => {
  it('全用語を初期表示する', () => {
    render(<GlossaryList terms={terms} />)
    expect(screen.getByText('オフサイド')).toBeInTheDocument()
    expect(screen.getByText('ストライカー')).toBeInTheDocument()
    expect(screen.getByText('ハットトリック')).toBeInTheDocument()
    expect(screen.getByText('3件の用語')).toBeInTheDocument()
  })

  it('検索でマッチする用語に絞り込む', async () => {
    const user = userEvent.setup()
    render(<GlossaryList terms={terms} />)
    await user.type(screen.getByLabelText('用語を検索'), 'オフサイド')
    expect(screen.getByText('オフサイド')).toBeInTheDocument()
    expect(screen.queryByText('ストライカー')).not.toBeInTheDocument()
  })

  it('カテゴリフィルタで絞り込む', async () => {
    const user = userEvent.setup()
    render(<GlossaryList terms={terms} />)
    await user.click(screen.getByRole('radio', { name: 'ポジション' }))
    expect(screen.getByText('ストライカー')).toBeInTheDocument()
    expect(screen.queryByText('オフサイド')).not.toBeInTheDocument()
  })

  it('該当なしのとき空状態を表示する', async () => {
    const user = userEvent.setup()
    render(<GlossaryList terms={terms} />)
    await user.type(screen.getByLabelText('用語を検索'), 'zzzzz')
    expect(screen.getByText('該当する用語がありません')).toBeInTheDocument()
  })

  it('各用語に anchorId が設定され直リンクできる', () => {
    const { container } = render(<GlossaryList terms={terms} />)
    expect(container.querySelector('#offside')).not.toBeNull()
  })
})
