import { describe, it, expect, vi, afterEach } from 'vitest'
import { triggerPrint } from './print'

describe('triggerPrint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls window.print()', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    triggerPrint()
    expect(printSpy).toHaveBeenCalledOnce()
  })
})
