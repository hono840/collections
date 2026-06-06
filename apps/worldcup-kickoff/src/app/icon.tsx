import { ImageResponse } from 'next/og'

/**
 * 動的ファビコン（32x32）。
 * ピッチグリーン背景に ⚽ を中央配置し、favicon.ico の 404 を解消する。
 * 絵文字描画なので Satori のフォント読み込みに依存せず、ビルド時に静的最適化される。
 */
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // ピッチグリーン（--color-pitch-600 / --color-pitch-800）の縦グラデーション
          background: 'linear-gradient(135deg, #0b7a3b 0%, #0a4f2a 100%)',
          borderRadius: 6,
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        ⚽
      </div>
    ),
    {
      ...size,
    },
  )
}
