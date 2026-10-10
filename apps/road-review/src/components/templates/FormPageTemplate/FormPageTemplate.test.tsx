import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormPageTemplate } from './FormPageTemplate'

// FormPageTemplate (architecture 2.1). Server template. Contract:
//   FormPageTemplate({ title: string; notice?: ReactNode; form: ReactNode })
// h1 title -> notice -> form, one column (max 640px, centred).

describe('FormPageTemplate', () => {
  it('renders the title as h1, then notice, then form', () => {
    render(
      <FormPageTemplate title="道を登録" notice={<p>お知らせスロット</p>} form={<form aria-label="フォーム" />} />,
    )
    const heading = screen.getByRole('heading', { level: 1, name: '道を登録' })
    const notice = screen.getByText('お知らせスロット')
    const form = screen.getByRole('form', { name: 'フォーム' })
    expect(heading.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(notice.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders without a notice', () => {
    render(<FormPageTemplate title="道を編集" form={<p>フォームスロット</p>} />)
    expect(screen.getByRole('heading', { level: 1, name: '道を編集' })).toBeInTheDocument()
    expect(screen.getByText('フォームスロット')).toBeInTheDocument()
  })
})
