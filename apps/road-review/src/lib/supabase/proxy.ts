import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

function isLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/')
}

// Paths reachable without a session (exact match, architecture ch.18.1 S-7).
// Everything else (including /loginfoo, /auth, /authx) requires login.
function isPublicPath(pathname: string): boolean {
  return isLoginPath(pathname) || pathname.startsWith('/auth/')
}

export type SecurityHeaders = {
  /** Forwarded to rendering as the x-nonce request header. */
  nonce: string
  /** Sent to the browser and forwarded to rendering (Next.js extracts the nonce from it). */
  contentSecurityPolicy: string
}

/**
 * Refreshes the Supabase session cookie on every matched request and
 * performs the optimistic auth redirects. Based on budget-app's
 * middleware.ts, switched from getUser() to getClaims() (Supabase docs).
 */
export async function updateSession(request: NextRequest, security: SecurityHeaders) {
  // Builds the pass-through response. Called again after a cookie refresh so the
  // refreshed request cookies AND the CSP/x-nonce headers are both forwarded.
  const nextResponse = () => {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', security.nonce)
    requestHeaders.set('Content-Security-Policy', security.contentSecurityPolicy)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', security.contentSecurityPolicy)
    return response
  }

  let supabaseResponse = nextResponse()
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
          supabaseResponse = nextResponse()
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

  if (isSignedIn && isLoginPath(pathname)) {
    const roadsUrl = request.nextUrl.clone()
    roadsUrl.pathname = '/roads'
    roadsUrl.search = ''
    return redirectTo(roadsUrl)
  }

  return supabaseResponse
}
