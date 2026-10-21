/**
 * OG 画像（architecture §8.1 / §8.2・design-spec §7）。
 * 1200x630・ネイビー地に白の「電卓 + ¥」マーク + H1（原文固定）+ ブランド + ドメイン。
 *
 * Satori は woff2 を読めないため、Noto Sans JP Bold の TTF サブセットを取得して日本語を描画する
 * （Chrome トークンを含まない UA だと Google Fonts が font/ttf を返す）。取得に失敗した場合は
 * ビルドを止めず、英字（既定フォントで描画可能）のブランド訴求へグレースフルにフォールバックする。
 */
import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_SUBTITLE, SITE_DOMAIN, SITE_TITLE } from '@/lib/site'
import { brandMarkSvg, svgDataUri } from '@/lib/og'
import { HERO_H1 } from '@/components/organisms/MarketingHero'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = SITE_TITLE
// 静的エクスポートではビルド時に1度だけ生成する（フォント取得もビルド時に完結）。
export const dynamic = 'force-static'

const NAVY = '#1E3A5F'
const ONNAVY = '#BBD0E8'
// woff2 非対応の Satori 向けに font/ttf を返させる UA（Chrome トークンなし）。
const TTF_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36'

/** 描画する文字のみをサブセット取得（日本語・英字ドメインを含む全字）。失敗時 null。 */
async function loadJpFont(text: string): Promise<ArrayBuffer | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`
    const css = await fetch(cssUrl, { headers: { 'User-Agent': TTF_UA }, signal: controller.signal }).then((r) => r.text())
    const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)
    if (match === null) return null
    return await fetch(match[1], { headers: { 'User-Agent': TTF_UA }, signal: controller.signal }).then((r) =>
      r.arrayBuffer(),
    )
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export default async function OpengraphImage() {
  const subsetText = Array.from(new Set((HERO_H1 + SITE_NAME + SITE_SUBTITLE + SITE_DOMAIN).split(''))).join('')
  const font = await loadJpFont(subsetText)
  const mark = svgDataUri(brandMarkSvg(96))

  if (font !== null) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: NAVY,
            color: '#ffffff',
            padding: '80px',
            justifyContent: 'space-between',
            fontFamily: 'Noto Sans JP',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img width={96} height={96} src={mark} alt="" />
            <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700 }}>{SITE_NAME}</div>
          </div>
          <div style={{ display: 'flex', fontSize: '66px', fontWeight: 700, lineHeight: 1.15, maxWidth: '1040px' }}>
            {HERO_H1}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: ONNAVY }}>
            <div style={{ display: 'flex', fontSize: '30px' }}>{SITE_SUBTITLE}</div>
            <div style={{ display: 'flex', fontSize: '26px' }}>{SITE_DOMAIN}</div>
          </div>
        </div>
      ),
      { ...size, fonts: [{ name: 'Noto Sans JP', data: font, weight: 700, style: 'normal' }] },
    )
  }

  // フォント取得不可: 日本語を避けたブランド訴求（英字は既定フォントで描画可能）。
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: NAVY,
          color: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
        }}
      >
        <img width={160} height={160} src={mark} alt="" />
        <div style={{ display: 'flex', fontSize: '64px', fontWeight: 700 }}>{SITE_DOMAIN}</div>
        <div style={{ display: 'flex', fontSize: '30px', color: ONNAVY }}>Menu cost calculator for restaurants</div>
      </div>
    ),
    { ...size },
  )
}
