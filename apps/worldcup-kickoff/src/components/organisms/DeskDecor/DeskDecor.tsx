import { cn } from '@/lib/utils/cn'

export interface DeskDecorProps {
  className?: string
}

/**
 * PC（lg 以上）専用の左右ガター装飾。本文（中央 max-w-480px 列）の外側だけを
 * ピッチグリーン基調 + ゴールド差し色 + W杯レッドで上品に飾る。
 *
 * 設計方針:
 * - `hidden lg:block` で lg 未満では一切描画しない（モバイルの見た目を変えない）。
 * - `fixed inset-0 overflow-hidden` で横スクロールを絶対に生まない。最背面 z-0。
 * - `pointer-events-none aria-hidden` で操作・読み上げに干渉しない純装飾。
 * - 中央列に被らないよう、左右ガター幅を `calc((100vw-30rem)/2)`（30rem=480px）で算出。
 * - 写真は使わず、CSS グラデーション + 自作 SVG のみ。淡色・低 opacity で可読性を損なわない。
 *
 * 表示専用のため Server Component（'use client' 不要）。
 */
export function DeskDecor({ className }: DeskDecorProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block',
        className,
      )}
    >
      {/* 中央 480px 列に被らないガター幅。本文の隙間に派手に出ないよう淡く保つ。 */}
      <Gutter side="left" />
      <Gutter side="right" />
    </div>
  )
}

/** 左右どちらかのガター（中央480px列の外側）に装飾を敷く */
function Gutter({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'absolute inset-y-0 w-[max(0px,calc((100vw-30rem)/2))]',
        side === 'left' ? 'left-0' : 'right-0',
      )}
    >
      {/* ピッチの芝目（縦縞）。極薄の pitch でうっすら陰影をつける。 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-pitch-50) 0, var(--color-pitch-50) 14px, transparent 14px, transparent 28px)',
        }}
      />

      {/* 紙吹雪（gold / pitch / kickoff の小さな丸）。motion-safe で非常にゆっくり浮遊。 */}
      <Confetti side={side} />

      {/* 大きく淡いシルエット（左=トロフィー / 右=サッカーボール）をガター下部に。 */}
      <div
        className={cn(
          'absolute bottom-6 text-pitch-100 opacity-30',
          side === 'left' ? 'left-6' : 'right-6',
        )}
      >
        {side === 'left' ? <TrophySilhouette /> : <BallSilhouette />}
      </div>
    </div>
  )
}

/** ガター内に疎に散らした紙吹雪。色・位置は左右で少しずらす。 */
function Confetti({ side }: { side: 'left' | 'right' }) {
  // ガター内の相対位置（%）。疎に・上品に。
  const dots =
    side === 'left'
      ? [
          { top: '12%', left: '24%', color: 'bg-gold-300', delay: '0s' },
          { top: '28%', left: '62%', color: 'bg-pitch-300', delay: '1.5s' },
          { top: '46%', left: '18%', color: 'bg-kickoff-300', delay: '0.8s' },
          { top: '64%', left: '54%', color: 'bg-gold-200', delay: '2.2s' },
          { top: '80%', left: '32%', color: 'bg-pitch-200', delay: '1.1s' },
        ]
      : [
          { top: '16%', left: '58%', color: 'bg-pitch-300', delay: '0.5s' },
          { top: '34%', left: '22%', color: 'bg-gold-300', delay: '1.9s' },
          { top: '52%', left: '66%', color: 'bg-gold-200', delay: '1.2s' },
          { top: '70%', left: '30%', color: 'bg-kickoff-300', delay: '0.3s' },
          { top: '86%', left: '60%', color: 'bg-pitch-200', delay: '2.5s' },
        ]

  return (
    <div className="absolute inset-0">
      {dots.map((dot, i) => (
        <span
          key={i}
          className={cn(
            'absolute h-2 w-2 rounded-full opacity-50 motion-safe:animate-float',
            dot.color,
          )}
          style={{
            top: dot.top,
            left: dot.left,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  )
}

/** トロフィーのシルエット（currentColor で塗る・淡色） */
function TrophySilhouette() {
  return (
    <svg
      width="160"
      height="200"
      viewBox="0 0 160 200"
      fill="currentColor"
      role="presentation"
    >
      {/* カップ本体 */}
      <path d="M48 24h64v40a32 32 0 0 1-64 0V24Z" />
      {/* 左右の取っ手 */}
      <path d="M48 32H30a14 14 0 0 0 0 28h6v-12h-6a2 2 0 0 1 0-4h12v-12Z" />
      <path d="M112 32h18a14 14 0 0 1 0 28h-6v-12h6a2 2 0 0 0 0-4h-12v-12Z" />
      {/* ステム + 台座 */}
      <path d="M72 96h16v28H72z" />
      <path d="M52 124h56v12H52z" />
      <path d="M44 142h72v18H44z" />
    </svg>
  )
}

/** サッカーボールのシルエット（簡略な五角形パターン・淡色） */
function BallSilhouette() {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="currentColor"
      role="presentation"
    >
      <circle cx="90" cy="90" r="78" />
      <path
        d="M90 52l24 17-9 28H75l-9-28 24-17Zm0 0V20m24 49l30-10m-21 56 19 25m-83-25-19 25M66 69l-30-10"
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}
