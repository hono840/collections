import type { Metadata, Viewport } from 'next'
import { BIZ_UDGothic, BIZ_UDPGothic, Shippori_Mincho_B1 } from 'next/font/google'
import './globals.css'

// Fonts (design spec 2-5 / 5-4). Japanese glyphs come from unicode-range slices.
const bizUdpGothic = BIZ_UDPGothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-biz',
  preload: true,
})

const shipporiMincho = Shippori_Mincho_B1({
  weight: '600',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-shippori',
  preload: false,
})

const bizUdGothic = BIZ_UDGothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bizud',
  preload: false,
})

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
  // MVP is light-only (C-09): no theme script, one browser UI color.
  themeColor: '#eef0ea',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${bizUdpGothic.variable} ${shipporiMincho.variable} ${bizUdGothic.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
