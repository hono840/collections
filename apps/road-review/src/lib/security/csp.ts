// Nonce-based strict CSP (architecture ch.18.1 S-5).
// Based on the Next.js 16 guide "content-security-policy" (Nonces / Adding a nonce with Proxy).
// Used by src/proxy.ts (Node.js runtime), so Web Crypto + Buffer are available.

// GSI (Geospatial Information Authority of Japan) map tiles
const GSI_ORIGIN = 'https://cyberjapandata.gsi.go.jp'

export type BuildCspOptions = {
  nonce: string
  isDev: boolean
  supabaseUrl: string
}

/** A fresh, unpredictable base64 nonce for one request. */
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

/** Content-Security-Policy header value (single line). */
export function buildCsp({ nonce, isDev, supabaseUrl }: BuildCspOptions): string {
  const supabaseOrigin = new URL(supabaseUrl).origin

  return [
    "default-src 'self'",
    // React uses eval only in development (server error stacks).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Leaflet sets inline styles on tiles/markers. No nonce here on purpose:
    // a nonce would make browsers ignore 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${GSI_ORIGIN} ${supabaseOrigin}`,
    "font-src 'self'",
    // No Realtime (WebSocket) usage, so no wss: here.
    `connect-src 'self' ${supabaseOrigin}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Local Supabase runs on http://127.0.0.1:54321, so only upgrade outside development.
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}
