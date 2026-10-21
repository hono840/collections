import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportPanel, type ExportPanelProps } from './ExportPanel'

function setup(overrides: Partial<ExportPanelProps> = {}) {
  const props: ExportPanelProps = {
    isPro: false,
    hasData: true,
    onExportMenusCsv: vi.fn(),
    onExportIngredientsCsv: vi.fn(),
    onExportBreakdownCsv: vi.fn(),
    onPrintMenus: vi.fn(),
    gateReason: null,
    onRequireUpgrade: vi.fn(),
    onDismissGate: vi.fn(),
    ...overrides,
  }
  render(<ExportPanel {...props} />)
  return props
}

describe('ExportPanel (Free)', () => {
  it('marks the section PRO and does NOT run an export — it requests the CSV upgrade gate', async () => {
    const p = setup({ isPro: false })
    expect(screen.getByText('PRO')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'メニュー一覧CSV' }))
    expect(p.onExportMenusCsv).not.toHaveBeenCalled()
    expect(p.onRequireUpgrade).toHaveBeenCalledWith('export-csv')
  })

  it('requests the PDF upgrade gate when a Free user clicks 印刷', async () => {
    const p = setup({ isPro: false })
    await userEvent.click(screen.getByRole('button', { name: 'メニュー表を印刷（PDF）' }))
    expect(p.onPrintMenus).not.toHaveBeenCalled()
    expect(p.onRequireUpgrade).toHaveBeenCalledWith('export-pdf')
  })

  it('renders the inline upgrade banner when the parent sets a gate reason', () => {
    setup({ isPro: false, gateReason: 'export-csv' })
    expect(screen.getByText('CSV出力はProです')).toBeInTheDocument()
  })
})

describe('ExportPanel (Pro)', () => {
  it('runs each CSV/print handler and never opens the gate', async () => {
    const p = setup({ isPro: true })
    expect(screen.queryByText('PRO')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'メニュー一覧CSV' }))
    await userEvent.click(screen.getByRole('button', { name: '食材マスタCSV' }))
    await userEvent.click(screen.getByRole('button', { name: '原価明細CSV' }))
    await userEvent.click(screen.getByRole('button', { name: 'メニュー表を印刷（PDF）' }))

    expect(p.onExportMenusCsv).toHaveBeenCalledOnce()
    expect(p.onExportIngredientsCsv).toHaveBeenCalledOnce()
    expect(p.onExportBreakdownCsv).toHaveBeenCalledOnce()
    expect(p.onPrintMenus).toHaveBeenCalledOnce()
    expect(p.onRequireUpgrade).not.toHaveBeenCalled()
  })

  it('disables the controls and explains when there is no data to export', async () => {
    const p = setup({ isPro: true, hasData: false })
    const button = screen.getByRole('button', { name: 'メニュー一覧CSV' })
    expect(button).toBeDisabled()
    expect(screen.getByText(/出力できるデータがありません/)).toBeInTheDocument()

    await userEvent.click(button)
    expect(p.onExportMenusCsv).not.toHaveBeenCalled()
  })
})
