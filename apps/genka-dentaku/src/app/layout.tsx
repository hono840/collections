import type { Metadata, Viewport } from 'next'
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  // metadataBase により OGP / canonical の相対パスが絶対URLへ解決される（architecture §8.2 / §11.4）。
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | 原価電卓',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...SITE_KEYWORDS],
  // 既定 canonical は '/'（各ページは自前の alternates.canonical で上書き）。
  alternates: { canonical: '/' },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  // OG 画像は src/app/opengraph-image.tsx（ImageResponse）を Next.js が自動で og:image に紐付ける。
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // design-spec §2.2 のネイビー支配色。
  themeColor: '#1E3A5F',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // webフォント（next/font）は不採用。フォントは globals.css の
  // システムフォントスタック（--font-sans / --font-num）で解決する（architecture §1.2）。
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-bg text-ink antialiased">{children}</body>
    </html>
  )
}
