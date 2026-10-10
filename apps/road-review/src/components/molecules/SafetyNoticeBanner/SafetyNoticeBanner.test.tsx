import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SafetyNoticeBanner } from './SafetyNoticeBanner'

describe('SafetyNoticeBanner (record form, always on — M-01)', () => {
  it('is a role="note" (not an alert) with the heading and body copy', () => {
    render(<SafetyNoticeBanner />)
    const note = screen.getByRole('note')
    expect(within(note).getByText('運転中は操作しないでください')).toBeInTheDocument()
    expect(
      within(note).getByText('記録は安全な場所に停車してから、またはドライブの後に行ってください。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cannot be dismissed (no buttons)', () => {
    render(<SafetyNoticeBanner />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides the decorative "P" mark from screen readers', () => {
    render(<SafetyNoticeBanner />)
    const note = screen.getByRole('note')
    const mark = within(note).queryByText('P')
    if (mark) expect(mark.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('never uses speed/time wording', () => {
    render(<SafetyNoticeBanner />)
    expect(screen.getByRole('note').textContent).not.toMatch(/タイム|速度|攻め|飛ばせ/)
  })
})
