import { cn } from '@/lib/utils/cn'
import type { Drivetrain } from '@/types/car'

export interface DrivetrainConfig {
  /** エンジン搭載位置 */
  engine: 'front' | 'mid' | 'rear'
  /** 前輪を駆動するか */
  front: boolean
  /** 後輪を駆動するか */
  rear: boolean
}

/** 駆動方式 → 構成（エンジン位置・駆動輪）。純関数でテスト可能 */
export function drivetrainConfig(dt: Drivetrain): DrivetrainConfig {
  switch (dt) {
    case 'FF':
      return { engine: 'front', front: true, rear: false }
    case 'FR':
      return { engine: 'front', front: false, rear: true }
    case 'MR':
      return { engine: 'mid', front: false, rear: true }
    case 'RR':
      return { engine: 'rear', front: false, rear: true }
    case 'AWD':
    case '4WD':
      return { engine: 'front', front: true, rear: true }
  }
}

export const DRIVETRAIN_INFO: Record<Drivetrain, { name: string; desc: string }> = {
  FF: { name: '前輪駆動 (FF)', desc: 'エンジンの動力を前輪に伝える。室内を広く取りやすい。' },
  FR: { name: '後輪駆動 (FR)', desc: '前のエンジンから後輪へ動力を伝える。スポーツ走行で好まれる。' },
  MR: { name: 'ミッドシップ後輪駆動 (MR)', desc: '重量物を車体中央に置き後輪を駆動。高い運動性。' },
  RR: { name: 'リアエンジン後輪駆動 (RR)', desc: '後方のエンジンで後輪を駆動する。' },
  AWD: { name: '全輪駆動 (AWD)', desc: '四輪すべてに動力を配分する。安定性が高い。' },
  '4WD': { name: '四輪駆動 (4WD)', desc: '四輪に動力を伝える。悪路に強い。' },
}

const ENGINE_X: Record<DrivetrainConfig['engine'], number> = {
  front: 88,
  mid: 170,
  rear: 256,
}

const FRONT_HUB = { x: 95, y: 122 }
const REAR_HUB = { x: 245, y: 122 }

function Wheel({ x, y, driven }: { x: number; y: number; driven: boolean }) {
  const color = driven ? 'var(--color-ck-accent)' : 'var(--color-ck-text-muted)'
  const spokes = Array.from({ length: 6 }, (_, i) => (
    <line
      key={i}
      x1={x}
      y1={y}
      x2={x}
      y2={y - 16}
      transform={`rotate(${i * 60} ${x} ${y})`}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  ))
  return (
    <g>
      {/* タイヤ（静止） */}
      <circle cx={x} cy={y} r={22} fill="none" stroke={color} strokeWidth={3} />
      {/* スポーク（駆動輪は回転） */}
      <g className={driven ? 'ck-wheel-driven' : undefined}>{spokes}</g>
      {/* ハブ */}
      <circle cx={x} cy={y} r={3} fill={color} />
    </g>
  )
}

export interface DrivetrainDiagramProps {
  drivetrain: Drivetrain
  className?: string
}

/**
 * 駆動方式アニメ図解（organism）。
 * 側面ビューで「エンジン → どの車輪へ動力が流れ、どのタイヤが回るか」を見せる。
 * 型ごとに 1 つの図で全車種に再利用でき、写真不使用・著作権ゼロ・$0。
 * 駆動輪はアクセント色＋回転、非駆動輪はミュート色＋静止で、色覚に依存せず区別できる。
 * モーションは prefers-reduced-motion で停止（静止でも色で判別可）。
 */
export function DrivetrainDiagram({ drivetrain, className }: DrivetrainDiagramProps) {
  const cfg = drivetrainConfig(drivetrain)
  const info = DRIVETRAIN_INFO[drivetrain]
  const ex = ENGINE_X[cfg.engine]

  // 動力の流れ（エンジン → 駆動輪ハブ）
  const flows: string[] = []
  if (cfg.front) flows.push(`M${ex},98 L${ex},122 L${FRONT_HUB.x},122`)
  if (cfg.rear) flows.push(`M${ex},98 L${ex},122 L${REAR_HUB.x},122`)

  return (
    <figure
      className={cn(
        'rounded-md border border-ck-border bg-ck-surface p-4',
        className
      )}
    >
      <svg
        viewBox="0 0 340 150"
        className="w-full"
        role="img"
        aria-label={`${info.name} の模式図。エンジンは${
          cfg.engine === 'front' ? '前' : cfg.engine === 'mid' ? '中央' : '後ろ'
        }、駆動輪は${
          cfg.front && cfg.rear ? '前後すべて' : cfg.front ? '前輪' : '後輪'
        }。`}
      >
        {/* 地面 */}
        <line x1="20" y1="122" x2="320" y2="122" stroke="var(--color-ck-grid)" strokeWidth={1} />

        {/* 車体シルエット（単線） */}
        <path
          d="M40,104 L40,100 Q42,86 74,80 L122,60 Q148,50 188,50 L226,52 Q264,56 286,80 L300,98 L300,104"
          fill="none"
          stroke="var(--color-ck-text-muted)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* 動力の流れ（駆動輪へ向かって破線が流れる） */}
        {flows.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--color-ck-accent)"
            strokeWidth={2.5}
            className="ck-powerflow"
          />
        ))}

        {/* エンジン */}
        <g>
          <rect
            x={ex - 16}
            y={78}
            width={32}
            height={20}
            rx={2}
            fill="var(--color-ck-primary)"
          />
          <text
            x={ex}
            y={92}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill="var(--color-ck-bg)"
          >
            ENG
          </text>
        </g>

        {/* 車輪 */}
        <Wheel x={FRONT_HUB.x} y={FRONT_HUB.y} driven={cfg.front} />
        <Wheel x={REAR_HUB.x} y={REAR_HUB.y} driven={cfg.rear} />
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base text-ck-text">{info.name}</span>
        <span className="ck-num text-xs text-ck-accent">● 駆動輪</span>
        <span className="text-sm text-ck-text-muted">{info.desc}</span>
      </figcaption>
    </figure>
  )
}
