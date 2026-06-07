import { ImageResponse } from 'next/og'
import { getCarDetail } from '@/features/cars/data'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'carskiida'

interface Props {
  params: Promise<{ manufacturer: string; model: string }>
}

/**
 * 車種詳細の OGP 画像（ブループリント意匠）。
 * 日本語フォントの読み込みを避けるため英字（nameEn）中心で構成する。
 */
export default async function OgImage({ params }: Props) {
  const { manufacturer, model } = await params
  const car = await getCarDetail(manufacturer, model)

  const titleEn = car ? `${car.manufacturer.nameEn} ${car.nameEn}` : 'carskiida'
  const years = car ? `${car.yearFrom}–${car.yearTo ?? 'now'}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundColor: '#0c1a33',
          backgroundImage:
            'linear-gradient(to right, #1e3a63 1px, transparent 1px), linear-gradient(to bottom, #1e3a63 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          color: '#e8eef5',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#37d0db',
          }}
        >
          carskiida — automotive encyclopedia
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, lineHeight: 1.1 }}>
            {titleEn}
          </div>
          {years && (
            <div style={{ display: 'flex', marginTop: 16, fontSize: 32, color: '#9db4ce' }}>
              {years}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: '#9db4ce',
          }}
        >
          generations × parts × production — with sources
        </div>
      </div>
    ),
    size
  )
}
