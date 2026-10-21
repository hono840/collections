import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 純静的エクスポート（HTML/CSS/JS を out/ に生成し Cloudflare Pages 無料枠へ配信）。
  // 静的エクスポートでは server actions / app/api / middleware / ISR（export const revalidate）
  // は一切使わない（architecture §11.1・§1.3）。ツール本体は 'use client' のクライアントアイランド、
  // ランディング等は静的 Server Component として生成する。
  output: 'export',
  // next/image は不採用（写真素材なし・装飾は CSS + インライン SVG）のため images.unoptimized は不要。
  // 将来ラスタ画像が必要になった場合のみ次を有効化する: images: { unoptimized: true },
}

export default nextConfig
