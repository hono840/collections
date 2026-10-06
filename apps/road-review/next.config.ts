import type { NextConfig } from 'next'

// Security headers + CSP without nonces (architecture doc ch.12-7).
// Nonces would force every page to dynamic rendering for little benefit here.
// Based on the Next.js "Without Nonces" CSP example.

const isDev = process.env.NODE_ENV === 'development'
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321').origin
// GSI (Geospatial Information Authority of Japan) map tiles
const gsiOrigin = 'https://cyberjapandata.gsi.go.jp'

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Leaflet sets inline styles on tiles/markers
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${gsiOrigin} ${supabaseOrigin}`,
  "font-src 'self'",
  // No Realtime (WebSocket) usage, so no wss: here.
  `connect-src 'self' ${supabaseOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Local Supabase runs on http://127.0.0.1:54321, so only upgrade in production builds.
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const nextConfig: NextConfig = {
  images: {
    // Photos are already resized/EXIF-stripped in the browser and served via
    // short-lived Supabase signed URLs; the Next image optimizer is not needed.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // The app never uses GPS/geolocation (CEO decision).
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
        ],
      },
    ]
  },
}

export default nextConfig
