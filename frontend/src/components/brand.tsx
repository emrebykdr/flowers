import { FLOWER_MAP } from '../domain/catalog'
import type { FlowerSummary } from '../domain/types'
import { cn } from '../lib/image'

/** Beş yapraklı sade işaret. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="20"
          cy="11.5"
          rx="6.2"
          ry="9"
          transform={`rotate(${a} 20 20)`}
          fill="#efccc6"
          stroke="#c4817b"
          strokeWidth="1.1"
        />
      ))}
      <circle cx="20" cy="20" r="4.2" fill="#9bb08c" stroke="#6b8160" strokeWidth="1" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-7" />
      <span className="font-display text-[1.35rem] tracking-[-0.02em] text-ink">
        Our<span className="italic text-blush-700">Bloom</span>
      </span>
    </span>
  )
}

/** Önizleme yokken buketin renklerinden soyut bir küme çizer. */
export function BouquetPlaceholder({ flowers, className }: { flowers: FlowerSummary[]; className?: string }) {
  const dots: { color: string; r: number }[] = []
  for (const f of flowers) {
    const r = FLOWER_MAP[f.type]?.headRadius ?? 3
    for (let i = 0; i < Math.min(f.count, 6); i++) dots.push({ color: f.color, r })
  }
  const shown = dots.slice(0, 18)
  return (
    <div className={cn('stage-bg relative flex items-center justify-center overflow-hidden', className)}>
      <svg viewBox="-50 -50 100 100" className="h-3/4 w-3/4" aria-hidden>
        <path d="M -16 8 L 0 46 L 16 8 Z" fill="#d9c3a5" opacity="0.7" />
        {shown.map((d, i) => {
          const a = i * 2.39996
          const rr = Math.sqrt((i + 0.5) / shown.length) * 22
          return (
            <circle
              key={i}
              cx={Math.sin(a) * rr}
              cy={-10 + Math.cos(a) * rr * 0.75}
              r={Math.max(4, d.r * 1.5)}
              fill={d.color}
              stroke="rgb(45 41 38 / 0.12)"
              strokeWidth="0.6"
            />
          )
        })}
      </svg>
    </div>
  )
}
