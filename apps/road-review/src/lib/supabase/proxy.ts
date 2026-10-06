import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

// Paths reachable without a session. Everything else requires login.
const PUBLIC_PATH_PREFIXES = ['/login', '/auth/']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix),
  )
}

/**
 * Refreshes the Supabase session cookie on every matched request and
 * performs the optimistic auth redirects. Based on budget-app's
 * middleware.ts, switched from getUser() to getClaims() (Supabase docs).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  // Cache headers that @supabase/ssr asks us to set when it rewrites auth cookies.
  let cacheHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
          cacheHeaders = headers
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  // Copies refreshed auth cookies and cache headers onto a redirect response
  // so the session is not lost when we redirect.
  const redirectTo = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    Object.entries(cacheHeaders).forEach(([key, value]) =>
      redirectResponse.headers.set(key, value),
    )
    return redirectResponse
  }

  if (!isSignedIn && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return redirectTo(loginUrl)
  }

  if (isSignedIn && (pathname === '/login' || pathname.startsWith('/login/'))) {
    const roadsUrl = request.nextUrl.clone()
    roadsUrl.pathname = '/roads'
    roadsUrl.search = ''
    return redirectTo(roadsUrl)
  }

  return supabaseResponse
}
