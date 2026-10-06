import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '公道レビュー',
    template: '%s | 公道レビュー',
  },
  description: '自分が走った道と走行記録を、自分だけのために残しておくアプリ。',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  )
}
