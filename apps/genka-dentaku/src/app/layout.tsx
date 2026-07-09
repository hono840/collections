import type { Metadata, Viewport } from 'next'
import './globals.css'

/**
 * OGP / canonical の絶対URL解決に使う基底。
 * sitemap.ts・robots.ts と同じ NEXT_PUBLIC_SITE_URL を優先し、未設定時は本番ドメインへフォールバック
 * （architecture §8.2 / §11.4）。末尾スラッシュは除去する。
 */
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://genka-dentaku.com'
).replace(/\/$/, '')

const siteName = '原価電卓'
const siteTitle = '原価電卓 — 飲食店のメニュー原価計算ツール'
// H1（原文固定・architecture §8.1）をディスクリプションに用いる。
const siteDescription = '仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: '%s | 原価電卓',
  },
  description: siteDescription,
  applicationName: siteName,
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'default',
  },
  // OG 画像（src/app/opengraph-image.tsx）は後続ステップで追加し、Next.js が自動で og:image に紐付ける。
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
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
