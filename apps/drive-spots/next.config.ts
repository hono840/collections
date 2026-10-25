import type { NextConfig } from 'next'

// Static export for GitHub Pages: https://hono840.github.io/collections/drive-spots/
// - output 'export': no server. GitHub Pages cannot set response headers, so the only CSP is the
//   hash-based <meta> CSP that `pnpm build` injects afterwards (scripts/csp/*).
// - basePath: the repository `hono840/collections` is a Pages *project* site (served under
//   /collections/), and the deploy workflow puts out/ under _site/drive-spots/. Every URL Next emits
//   (/_next/static/..., next/font files, next/link hrefs, metadata icons) gets this prefix.
//   A hand-written string such as <img src="/x.png"> does NOT; import the file instead.
//   Must stay equal to BASE_PATH in scripts/site-config.mjs (a test and verify-out enforce it).
// - trailingSlash: pages are written as dir/index.html, which GitHub Pages serves at dir/.
// - images.unoptimized: the default image loader needs a server.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/collections/drive-spots',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
