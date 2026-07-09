/**
 * favicon / アプリアイコン（architecture §8.1・design-spec §7）。
 * ImageResponse でネイビー地 + 白の「電卓 + ¥」マークを生成。文字を使わないため
 * フォント依存がなく、静的エクスポートでも決定的にビルドできる。
 */
import { ImageResponse } from 'next/og'
import { brandMarkSvg, svgDataUri } from '@/lib/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
// 静的エクスポートではビルド時に1度だけ生成する。
export const dynamic = 'force-static'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <img
          width={size.width}
          height={size.height}
          src={svgDataUri(brandMarkSvg(size.width, { background: '#1E3A5F' }))}
          alt=""
        />
      </div>
    ),
    { ...size },
  )
}
