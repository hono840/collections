/**
 * OG / アイコン用のブランドマーク（design-spec §7 / §2.2）。
 * 「電卓の枠 + ¥」を白ストロークで描いたベクター。フォント依存を避けるため文字ではなく
 * SVG パスで描画し、favicon〜OG まで同じ意匠を使い回す。ImageResponse（Satori）では
 * <img> の data-URI として渡すのが最も安定するため、SVG 文字列と data-URI 化を提供する。
 */

/** ネイビー地に載せる白のブランドマーク SVG 文字列。`background` 指定でベタ地付き（アイコン用）。 */
export function brandMarkSvg(px: number, opts?: { background?: string }): string {
  const bg = opts?.background ? `<rect width="100" height="100" fill="${opts.background}"/>` : ''
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">`,
    bg,
    // 電卓の枠
    `<rect x="19" y="11" width="62" height="78" rx="15" fill="none" stroke="#ffffff" stroke-width="6"/>`,
    // ¥（V字 + 縦棒 + 2本の横棒）
    `<path d="M35 29 L50 50 L65 29 M50 50 L50 75 M37 56 H63 M37 65 H63" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`,
  ].join('')
}

/** SVG 文字列を data-URI に変換（ImageResponse の <img src> 用）。 */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
