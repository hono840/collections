import { ImageResponse } from 'next/og'

/**
 * OGP 画像（1200x630）。SNS 共有時のカードに表示される。
 * ピッチグリーン基調 + ブランド「キックオフ」+ サブタイトル + ⚽。
 * ルート直下に置くことで全ルートのデフォルト OG 画像として継承される。
 * 絵文字・システムフォント描画のみで完結させ、外部フォント読み込みは行わない。
 */
export const alt = 'キックオフ | 2026 ワールドカップ観戦ガイド'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // ピッチグリーンの斜めグラデーション（--color-pitch-600 → 800）
          background: 'linear-gradient(135deg, #0b7a3b 0%, #096331 55%, #0a4f2a 100%)',
          color: '#ffffff',
          padding: '64px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 140, lineHeight: 1 }}>⚽</div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 116,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          キックオフ
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 44,
            fontWeight: 500,
            // ゴールド寄りのアクセント（--color-gold-400）
            color: '#f4c430',
          }}
        >
          2026 ワールドカップ観戦ガイド
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 28,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          ルール・選手・国がわからなくても、観て学べる
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
