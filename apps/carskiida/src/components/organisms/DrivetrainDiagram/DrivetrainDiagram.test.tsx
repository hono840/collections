import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrivetrainDiagram, drivetrainConfig } from './DrivetrainDiagram'

describe('drivetrainConfig', () => {
  it('FF はフロントエンジン・前輪駆動', () => {
    expect(drivetrainConfig('FF')).toEqual({ engine: 'front', front: true, rear: false })
  })
  it('FR はフロントエンジン・後輪駆動', () => {
    expect(drivetrainConfig('FR')).toEqual({ engine: 'front', front: false, rear: true })
  })
  it('MR はミッドシップ・後輪駆動', () => {
    expect(drivetrainConfig('MR')).toEqual({ engine: 'mid', front: false, rear: true })
  })
  it('RR はリアエンジン・後輪駆動', () => {
    expect(drivetrainConfig('RR')).toEqual({ engine: 'rear', front: false, rear: true })
  })
  it('AWD / 4WD は前後とも駆動', () => {
    expect(drivetrainConfig('AWD')).toMatchObject({ front: true, rear: true })
    expect(drivetrainConfig('4WD')).toMatchObject({ front: true, rear: true })
  })
})

describe('DrivetrainDiagram', () => {
  it('駆動方式名を表示する', () => {
    render(<DrivetrainDiagram drivetrain="FR" />)
    expect(screen.getByText(/後輪駆動 \(FR\)/)).toBeInTheDocument()
  })

  it('アクセシブルな説明（aria-label）を持つ', () => {
    render(<DrivetrainDiagram drivetrain="AWD" />)
    expect(screen.getByRole('img', { name: /駆動輪は前後すべて/ })).toBeInTheDocument()
  })
})
