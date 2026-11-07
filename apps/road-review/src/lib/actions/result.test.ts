import { describe, expect, it } from 'vitest'
import { actionError, actionOk } from './result'

describe('actionOk', () => {
  it('wraps data in a success result', () => {
    expect(actionOk({ email: 'hiro@example.com' })).toEqual({
      ok: true,
      data: { email: 'hiro@example.com' },
    })
  })

  it('adds a warning only when given', () => {
    expect(actionOk(undefined, 'storage_cleanup_pending')).toEqual({
      ok: true,
      data: undefined,
      warning: 'storage_cleanup_pending',
    })
    expect(actionOk(undefined)).not.toHaveProperty('warning')
  })
})

describe('actionError', () => {
  it('builds an error result with code and message', () => {
    const result = actionError('rate_limited', '時間をおいてもう一度お試しください')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('rate_limited')
    expect(result.error.message).toBe('時間をおいてもう一度お試しください')
  })

  it('carries field errors', () => {
    const result = actionError('validation', '入力内容を確認してください', { email: ['x'] })
    if (result.ok) throw new Error('expected an error result')
    expect(result.error.fieldErrors).toEqual({ email: ['x'] })
  })
})
