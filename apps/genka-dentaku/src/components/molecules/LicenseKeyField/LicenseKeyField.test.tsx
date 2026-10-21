import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LicenseKeyField } from './LicenseKeyField'

describe('LicenseKeyField', () => {
  it('verifies the trimmed key on 解錠', async () => {
    const onVerify = vi.fn()
    render(<LicenseKeyField status="idle" onVerify={onVerify} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'ライセンスキー' }), '  GENKA-KEY  ')
    await userEvent.click(screen.getByRole('button', { name: '解錠' }))
    expect(onVerify).toHaveBeenCalledWith('GENKA-KEY')
  })

  it('disables 解錠 while verifying and marks the button busy', () => {
    render(<LicenseKeyField status="verifying" onVerify={() => {}} defaultValue="GENKA-KEY" />)
    const btn = screen.getByRole('button', { name: '解錠' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a success message', () => {
    render(<LicenseKeyField status="success" onVerify={() => {}} />)
    expect(screen.getByText('Proを解錠しました')).toBeInTheDocument()
  })

  it('shows an error message and flags the input invalid', () => {
    render(<LicenseKeyField status="error" onVerify={() => {}} />)
    expect(screen.getByText('ライセンスキーが正しくありません')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'ライセンスキー' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows an unsupported-browser message', () => {
    render(<LicenseKeyField status="unsupported" onVerify={() => {}} />)
    expect(screen.getByText('このブラウザではライセンスを確認できません')).toBeInTheDocument()
  })
})
