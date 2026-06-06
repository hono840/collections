import type { MetadataRoute } from 'next'

/**
 * PWA マニフェスト。ホーム画面に追加した際の名称・テーマ色・アイコンを定義する。
 * アイコンは動的生成の /icon・/apple-icon を参照する（favicon.ico への依存を避ける）。
 * theme_color / background_color はピッチグリーン基調で layout の viewport.themeColor と揃える。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'キックオフ | 2026 ワールドカップ観戦ガイド',
    short_name: 'キックオフ',
    description:
      'ルール・選手・国がわからなくても大丈夫。2026 FIFA ワールドカップを「観て学べる」初心者向け日本語ガイド。',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf7',
    theme_color: '#0b7a3b',
    lang: 'ja',
    orientation: 'portrait',
    categories: ['sports', 'education', 'entertainment'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
