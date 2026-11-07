import type { NextConfig } from 'next'

// v2/v3: the app is a static export served as-is from `out/` (ADR road-review-adr-static-export).
// - output 'export': no server, no proxy, no Server Actions, no next.config headers / redirects.
//   Response headers (CSP etc.) and redirects move to vercel.json in stage 3.
// - trailingSlash: `/road` is written as `out/road/index.html` and served at `/road/`.
//   vercel.json must also set "trailingSlash": true (framework: null ignores this file's setting).
// - images.unoptimized: the default image loader needs a server.

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
