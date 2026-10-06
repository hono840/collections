import type { NextRequest } from 'next/server'
import { buildCsp, createNonce } from '@/lib/security/csp'
import { updateSession } from '@/lib/supabase/proxy'

// Next.js 16: `middleware` was renamed to `proxy` (Node.js runtime only).
export async function proxy(request: NextRequest) {
  // A fresh nonce per request (architecture ch.18.1 S-5). Next.js reads the nonce
  // from the forwarded Content-Security-Policy request header while rendering.
  const nonce = createNonce()
  const contentSecurityPolicy = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  })
  return await updateSession(request, { nonce, contentSecurityPolicy })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
}
