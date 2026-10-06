import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
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

/**
 * Runs before first paint (design spec 5-3): applies the saved theme
 * ("system" | "light" | "dark" in localStorage "rr-theme") and follows the OS
 * setting while on "system". Allowed by the CSP through the per-request nonce
 * that proxy.ts forwards as the `x-nonce` request header (S-5).
 */
const themeScript = `(function(){try{var key='rr-theme';var media=window.matchMedia('(prefers-color-scheme: dark)');var apply=function(){var saved=localStorage.getItem(key);var dark=saved==='dark'||(saved!=='light'&&media.matches);document.documentElement.classList.toggle('dark',dark);};apply();media.addEventListener('change',apply);window.addEventListener('storage',function(event){if(event.key===key)apply();});}catch(error){}})();`

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef0ea' },
    { media: '(prefers-color-scheme: dark)', color: '#1b2329' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Reading headers() makes every page dynamic, which nonce-based CSP requires.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${bizUdpGothic.variable} ${shipporiMincho.variable} ${bizUdGothic.variable}`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
