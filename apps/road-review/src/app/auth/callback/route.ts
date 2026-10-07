import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { NEXT_PATH_COOKIE } from '@/lib/auth/next-path-cookie'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/safe-next-path'

const LINK_INVALID_PATH = '/login?error=link_invalid'

/** Same-origin redirect. `path` is always a fixed path or a safeNextPath() result. */
function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin))
}

/**
 * PKCE magic link landing (architecture ch.21). Supabase's default email links to
 * `/auth/callback?code=…`; the code is exchanged with the code_verifier cookie that
 * only the browser that requested the link has, so a GET exchange cannot be used
 * for login CSRF (18.1 S-6). The target comes only from the httpOnly rr_next cookie;
 * any `?next=` query is ignored. `?token_hash=` belongs to /auth/confirm (POST only).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')?.trim()
  // An `error` param means Supabase already rejected the link (expired, used, …).
  // Expired / missing: keep rr_next so a fresh link still returns to the same page.
  if (searchParams.has('error') || !code) return redirectTo(request, LINK_INVALID_PATH)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return redirectTo(request, LINK_INVALID_PATH)

  const cookieStore = await cookies()
  const nextPath = safeNextPath(cookieStore.get(NEXT_PATH_COOKIE)?.value)
  cookieStore.delete(NEXT_PATH_COOKIE)
  return redirectTo(request, nextPath)
}
