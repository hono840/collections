import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { NEXT_PATH_COOKIE } from '@/lib/auth/next-path-cookie'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/safe-next-path'

/**
 * Magic-link landing (email template: {{ .RedirectTo }}/auth/confirm?token_hash=...&type=email).
 * token_hash + verifyOtp works even when the link is opened in another browser (unlike PKCE ?code=).
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')

  if (tokenHash && type === 'email') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash })
    if (!error) {
      const cookieStore = await cookies()
      const nextPath = safeNextPath(cookieStore.get(NEXT_PATH_COOKIE)?.value)
      cookieStore.delete(NEXT_PATH_COOKIE)
      redirect(nextPath)
    }
  }
  redirect('/login?error=link_invalid')
}
