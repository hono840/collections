import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { FavoriteTeamProvider } from '@/components/providers/FavoriteTeamProvider'
import { SiteHeader } from '@/components/organisms/SiteHeader'
import { BottomNav } from '@/components/organisms/BottomNav'

/**
 * 日本語主体のため Noto Sans JP を採用。
 * variable font + display:swap で CLS を抑制し、CSS 変数（--font-noto-sans-jp）
 * として globals.css の --font-sans から参照する。
 */
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
})

/**
 * OGP / canonical の絶対URL解決に使う基底。
 * sitemap.ts・robots.ts と同じ NEXT_PUBLIC_SITE_URL を優先する。
 */
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldcup-kickoff.vercel.app'
).replace(/\/$/, '')

const siteName = 'キックオフ'
const siteTitle = 'キックオフ | 2026 ワールドカップ観戦ガイド'
const siteDescription =
  'ルール・選手・国がわからなくても大丈夫。2026 FIFA ワールドカップを「観て学べる」初心者向け日本語ガイド。日程・国図鑑・推し国診断・勝敗予想で楽しもう。'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: '%s | キックオフ',
  },
  description: siteDescription,
  applicationName: siteName,
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'default',
  },
  // OG 画像（src/app/opengraph-image.tsx）は Next.js が自動で og:image に紐付ける。
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
  themeColor: '#0b7a3b',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="min-h-dvh bg-bg text-text antialiased">
        <FavoriteTeamProvider>
          {/*
            アプリ全体は中央寄せ・最大幅 ~480px のモバイルファースト枠。
            上下の固定要素（SiteHeader: fixed top-0 / h-14、BottomNav: fixed bottom-0 / h-16）に
            重ならないよう、<main> に pt-14 / pb-16 を確保している。
          */}
          <SiteHeader />
          {/*
            overflow-x-clip でページ全体の横スクロールを封じ、固定ヘッダー
            （SiteHeader）が画面外へ流れるのを防ぐ。hidden ではなく clip を使う
            のが要点。hidden はスクロールコンテナ（scrolling box）を生成し、
            その結果 overflow-y が auto に解釈されて <main> 自身が子孫の
            position: sticky の祖先スクロールボックスになり、/matches の日付見出し
            （sticky top-14）の追従が壊れる。clip はスクロールコンテナを作らず
            overflow-y を visible のまま残せるため、横あふれだけを切り取りつつ
            sticky を維持できる。ブラケット等の横スクロールは内側コンテナで完結させる。
          */}
          <main className="mx-auto w-full max-w-[480px] overflow-x-clip px-4 pt-14 pb-16">
            {children}
          </main>
          <BottomNav />
        </FavoriteTeamProvider>
      </body>
    </html>
  )
}
