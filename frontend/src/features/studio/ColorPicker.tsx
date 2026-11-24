import { Check, Pipette } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Swatch } from '../../domain/catalog'
import { cn } from '../../lib/image'

// ---- renk dönüşümleri ----

function hexToHsv(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  const r = ((v >> 16) & 255) / 255
  const g = ((v >> 8) & 255) / 255
  const b = (v & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

const HEX = /^#[0-9a-f]{6}$/i

export function isLight(hex: string) {
  const v = parseInt(hex.slice(1), 16)
  const r = (v >> 16) & 255
  const g = (v >> 8) & 255
  const b = v & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 186
}

/** Doygunluk-parlaklık alanı + ton çubuğu + hex alanı. Dokunmatikte rahat kullanılır. */
export function ColorPicker({ value, onChange, onChangeStart }: { value: string; onChange: (hex: string) => void; onChangeStart?: () => void }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [hexText, setHexText] = useState(value)
  const lastEmitted = useRef(value)
  const square = useRef<HTMLDivElement>(null)
  const hue = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.toLowerCase() !== lastEmitted.current.toLowerCase()) {
      setHsv(hexToHsv(value))
      lastEmitted.current = value
    }
    setHexText(value)
  }, [value])

  const emit = (h: number, s: number, v: number) => {
    setHsv([h, s, v])
    const hex = hsvToHex(h, s, v)
    lastEmitted.current = hex
    onChange(hex)
  }

  const track = (el: HTMLDivElement | null, e: ReactPointerEvent, fn: (x: number, y: number) => void) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const calc = (cx: number, cy: number) =>
      fn(Math.min(1, Math.max(0, (cx - rect.left) / rect.width)), Math.min(1, Math.max(0, (cy - rect.top) / rect.height)))
    onChangeStart?.()
    el.setPointerCapture(e.pointerId)
    calc(e.clientX, e.clientY)
    const move = (ev: PointerEvent) => calc(ev.clientX, ev.clientY)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const [h, s, v] = hsv
  return (
    <div className="space-y-3">
      <div
        ref={square}
        className="relative h-36 w-full cursor-crosshair touch-none rounded-2xl"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))` }}
        onPointerDown={(e) => track(square.current, e, (x, y) => emit(h, x, 1 - y))}
        role="slider"
        aria-label="Doygunluk ve parlaklık"
        aria-valuetext={value}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = 0.04
          if (e.key === 'ArrowRight') emit(h, Math.min(1, s + step), v)
          else if (e.key === 'ArrowLeft') emit(h, Math.max(0, s - step), v)
          else if (e.key === 'ArrowUp') emit(h, s, Math.min(1, v + step))
          else if (e.key === 'ArrowDown') emit(h, s, Math.max(0, v - step))
          else return
          e.preventDefault()
        }}
      >
        <span
          className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_2px_6px_rgb(0_0_0/0.3)]"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }}
        />
      </div>
      <div
        ref={hue}
        className="relative h-7 w-full cursor-pointer touch-none rounded-full"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        onPointerDown={(e) => track(hue.current, e, (x) => emit(Math.min(359.9, x * 360), s, v))}
        role="slider"
        aria-label="Renk tonu"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(h)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') emit((h + 4) % 360, s, v)
          else if (e.key === 'ArrowLeft') emit((h + 356) % 360, s, v)
          else return
          e.preventDefault()
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_2px_6px_rgb(0_0_0/0.3)]"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="size-10 shrink-0 rounded-xl border border-line" style={{ background: value }} />
        <input
          value={hexText}
          onChange={(e) => {
            const t = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setHexText(t)
            if (HEX.test(t)) {
              onChangeStart?.()
              setHsv(hexToHsv(t))
              lastEmitted.current = t.toLowerCase()
              onChange(t.toLowerCase())
            }
          }}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="none"
          className="h-10 w-full rounded-xl border border-line bg-paper px-3 font-mono text-base uppercase text-ink focus:border-ink/30 focus:outline-none"
          aria-label="Renk kodu"
        />
        {'EyeDropper' in window && (
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft hover:text-ink"
            aria-label="Ekrandan renk seç"
            onClick={async () => {
              try {
                const picker = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
                const r = await picker.open()
                onChangeStart?.()
                onChange(r.sRGBHex.toLowerCase())
              } catch {
                // vazgeçildi
              }
            }}
          >
            <Pipette className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export function Swatches({
  swatches,
  value,
  onPick,
  custom,
  onCustom,
  customOpen,
}: {
  swatches: Swatch[]
  value: string
  onPick: (hex: string) => void
  custom?: boolean
  onCustom?: () => void
  customOpen?: boolean
}) {
  const inPalette = swatches.some((s) => s.hex.toLowerCase() === value.toLowerCase())
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Renk">
      {swatches.map((s) => {
        const active = s.hex.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={s.hex}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={s.name}
            title={s.name}
            onClick={() => onPick(s.hex)}
            className={cn(
              'relative inline-flex size-10 items-center justify-center rounded-full border transition active:scale-95',
              active ? 'border-ink ring-2 ring-ink/15 ring-offset-2 ring-offset-paper' : 'border-black/10',
            )}
            style={{ background: s.hex }}
          >
            {active && <Check className={cn('size-4', isLight(s.hex) ? 'text-ink' : 'text-white')} strokeWidth={2.5} />}
          </button>
        )
      })}
      {custom && (
        <button
          type="button"
          onClick={onCustom}
          aria-expanded={customOpen}
          aria-label="Özel renk"
          title="Özel renk"
          className={cn(
            'relative inline-flex size-10 items-center justify-center rounded-full border transition active:scale-95',
            !inPalette ? 'border-ink ring-2 ring-ink/15 ring-offset-2 ring-offset-paper' : 'border-black/10',
          )}
          style={{
            background: !inPalette ? value : 'conic-gradient(from 0deg, #f3a6a6, #f6d98a, #b9d8a6, #9fc6e8, #c4a9e6, #f3a6a6)',
          }}
        >
          {!inPalette && <Check className={cn('size-4', isLight(value) ? 'text-ink' : 'text-white')} strokeWidth={2.5} />}
        </button>
      )}
    </div>
  )
}
