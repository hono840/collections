import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SampleDataBanner } from './SampleDataBanner'

describe('SampleDataBanner', () => {
  it('labels the sample data and fires onClear', async () => {
    const onClear = vi.fn()
    render(<SampleDataBanner onClear={onClear} />)
    expect(screen.getByText('サンプル')).toBeInTheDocument()
    expect(screen.getByText('これはサンプルです')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'サンプルを消して自分のデータを入力' }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
