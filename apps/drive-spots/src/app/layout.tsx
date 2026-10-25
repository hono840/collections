import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Zen_Kaku_Gothic_New } from 'next/font/google'
import './globals.css'

// Fonts (spec AC19, design Main.dc.html). next/font downloads the files at BUILD time and serves them
// from /collections/drive-spots/_next/static/media/, so the browser never contacts Google (AC21).
const barlowCondensed = Barlow_Condensed({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow',
})

// Japanese glyphs come as ~120 unicode-range slices per weight. With preload on, Next emits a
// <link rel="preload"> for every slice (243 files, ~4.9 MB). preload: false lets the browser fetch
// only the slices for characters actually on screen.
const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zen',
  preload: false,
})

export const metadata: Metadata = {
  title: 'ドライブスポット帳',
  description: '行きたい道をメモして、行ったら「行った」に移す自分用のアプリ。',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0E1013',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${barlowCondensed.variable} ${zenKakuGothicNew.variable}`}>
      <body>{children}</body>
    </html>
  )
}
