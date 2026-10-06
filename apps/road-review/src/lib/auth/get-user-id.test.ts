// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('server-only', () => ({}))

import { getUserId } from './get-user-id'

function fakeClient(result: { data: unknown; error: unknown }) {
  return { auth: { getClaims: vi.fn().mockResolvedValue(result) } } as unknown as SupabaseClient
}

describe('getUserId', () => {
  it('returns the sub claim when signed in', async () => {
    const supabase = fakeClient({ data: { claims: { sub: 'user-a' } }, error: null })
    await expect(getUserId(supabase)).resolves.toBe('user-a')
  })

  it('returns null when there is no session', async () => {
    await expect(getUserId(fakeClient({ data: null, error: null }))).resolves.toBeNull()
  })

  it('returns null when getClaims fails', async () => {
    const supabase = fakeClient({ data: { claims: { sub: 'user-a' } }, error: new Error('bad jwt') })
    await expect(getUserId(supabase)).resolves.toBeNull()
  })
})
