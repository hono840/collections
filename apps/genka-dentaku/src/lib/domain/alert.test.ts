import { describe, it, expect } from 'vitest'
import { alertStatus } from './alert'

// Default thresholds from PRD 0.6: warn=30, danger=35.
describe('alertStatus (judged on the already-rounded percent value)', () => {
  it('null rate -> attention (要確認)', () => {
    expect(alertStatus(null, 30, 35)).toBe('attention')
  })
  it('below warn -> good', () => {
    expect(alertStatus(29.9, 30, 35)).toBe('good')
    expect(alertStatus(24.8, 30, 35)).toBe('good')
    expect(alertStatus(0, 30, 35)).toBe('good')
  })
  it('warn..danger inclusive -> caution', () => {
    expect(alertStatus(30, 30, 35)).toBe('caution')
    expect(alertStatus(30.9, 30, 35)).toBe('caution')
    expect(alertStatus(35, 30, 35)).toBe('caution')
  })
  it('above danger -> danger (35.0 caution, 35.1 danger)', () => {
    expect(alertStatus(35.1, 30, 35)).toBe('danger')
    expect(alertStatus(38, 30, 35)).toBe('danger')
  })
  it('respects custom thresholds', () => {
    // danger lowered to 28: a 32% menu becomes danger
    expect(alertStatus(32, 30, 28)).toBe('danger')
  })
})
