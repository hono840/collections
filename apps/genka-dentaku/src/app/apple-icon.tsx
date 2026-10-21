/**
 * Apple touch icon（architecture §8.1・design-spec §7）。
 * iOS はアイコンを自動でマスク・角丸化するため、ネイビーのベタ地で全面を埋める。
 */
import { ImageResponse } from 'next/og'
import { brandMarkSvg, svgDataUri } from '@/lib/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
// 静的エクスポートではビルド時に1度だけ生成する。
export const dynamic = 'force-static'

export default function AppleIcon() {
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
