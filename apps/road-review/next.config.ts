import type { NextConfig } from 'next'

// Static security headers. The Content-Security-Policy is set per request with a
// nonce in src/proxy.ts (architecture ch.18.1 S-5), so it is not set here.

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
