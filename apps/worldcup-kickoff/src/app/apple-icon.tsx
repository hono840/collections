import { ImageResponse } from 'next/og'

/**
 * Apple タッチアイコン（180x180）。
 * icon.tsx と同デザイン（ピッチグリーン + ⚽）をホーム画面追加用の大サイズで生成する。
 */
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // ピッチグリーン（--color-pitch-600 / --color-pitch-800）の斜めグラデーション
          background: 'linear-gradient(135deg, #0b7a3b 0%, #0a4f2a 100%)',
          fontSize: 120,
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
