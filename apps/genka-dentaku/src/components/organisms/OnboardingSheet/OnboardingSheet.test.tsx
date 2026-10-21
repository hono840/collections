import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingSheet } from './OnboardingSheet'

describe('OnboardingSheet', () => {
  it('seeds the sample then shows the magic-moment tip and finishes', async () => {
    const onLoadSample = vi.fn()
    const onFinish = vi.fn()
    render(<OnboardingSheet open onLoadSample={onLoadSample} onStartBlank={() => {}} onFinish={onFinish} />)

    expect(screen.getByText('データは端末内のみ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'サンプルで試す' }))
    expect(onLoadSample).toHaveBeenCalledOnce()

    // Advances to the tip that names the exact wedge edit.
    expect(screen.getByText(/鶏もも肉/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'はじめる' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('lets the user start from an empty state', async () => {
    const onStartBlank = vi.fn()
    render(<OnboardingSheet open onLoadSample={() => {}} onStartBlank={onStartBlank} onFinish={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '自分の食材から始める' }))
    expect(onStartBlank).toHaveBeenCalledOnce()
  })
})
