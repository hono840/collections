import type { Metadata } from 'next'
import { Zen_Old_Mincho, Zen_Kaku_Gothic_New, IBM_Plex_Mono } from 'next/font/google'
import { CompareTray } from '@/components/organisms/CompareTray'
import './globals.css'

// 和文見出し（明朝）— 専門誌・百科の格
const zenOldMincho = Zen_Old_Mincho({
  variable: '--font-zen-old-mincho',
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

// 和文本文（ゴシック）
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-zen-kaku',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

// 型式・諸元数値（等幅）— 計器/図面の言語
const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://carskiida.app'),
  title: {
    default: 'carskiida — 車の図鑑',
    template: '%s | carskiida',
  },
  description:
    '車種を世代史 × パーツ構造 × 生産地で立体的に引ける、日本語の自動車百科事典。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ja"
      className={`${zenOldMincho.variable} ${zenKaku.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#1b2a4a" />
        <script
          // 初回描画前にテーマを確定し、ちらつきを防ぐ
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ck-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-dvh bg-ck-bg font-body text-ck-text antialiased">
        {children}
        <CompareTray />
      </body>
    </html>
  )
}
