import { BufferGeometry, Vector3 } from 'three'
import type { Packaging } from '../domain/types'
import { addRibbonStrip, addTube, GeoBuilder } from './geometry'
import type { BouquetLayout } from './layout'
import { clamp, fbm2, lerp, noise2, smoothstep, TAU, type RGB } from './math'

interface SheetOpts {
  /** Azimut aralığı; 0 = ön (+Z). */
  t0: number
  t1: number
  rimY: number
  peakAt?: number
  peak?: number
  peakWidth?: number
  wave?: number
  rOffset: number
  bottomY: number
  taper: boolean
  pleats: number
  pleatAmp: number
  crumple: number
  crumpleScale: number
  seed: number
  shade: number
}

interface WrapContext {
  neckR: number
  rimR: number
  yRef: number
}

function angDiff(a: number, b: number) {
  let d = (a - b) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

function addSheet(b: GeoBuilder, ctx: WrapContext, o: SheetOpts) {
  const span = o.t1 - o.t0
  const full = Math.abs(span - TAU) < 1e-3
  const cols = Math.max(8, Math.round((span / TAU) * 72))
  const rows = 30
  const rimAt = (th: number) => {
    // Ön taraf alçak, arka yüksek: çiçekler önden görünsün
    let y = o.rimY + (o.wave ?? 0) * Math.sin(th * 3 + o.seed) - 2.6 * Math.max(0, Math.cos(th)) + 1.2 * Math.max(0, -Math.cos(th))
    if (o.peak && o.peakAt !== undefined) {
      const d = Math.abs(angDiff(th, o.peakAt)) / (o.peakWidth ?? 1.4)
      y += o.peak * Math.pow(Math.max(0, 1 - d), 1.6)
    }
    return y
  }
  const baseR = (y: number) => {
    if (y >= 0) {
      const t = Math.min(1.3, y / ctx.yRef)
      return ctx.neckR + (ctx.rimR - ctx.neckR) * Math.pow(t, 0.72)
    }
    if (o.taper) {
      const t = clamp(y / o.bottomY, 0, 1)
      return ctx.neckR * 1.15 * Math.pow(1 - t, 0.45) + 0.05
    }
    const t = clamp(-y / 8, 0, 1)
    return ctx.neckR * (1.06 + 0.32 * smoothstep(0, 1, t))
  }

  b.grid(rows + 1, cols + 1, (i, j, out) => {
    const v = i / rows
    const th = o.t0 + (j / cols) * span
    const top = rimAt(th)
    const y = lerp(o.bottomY, top, v)
    let r = baseR(y) + o.rOffset
    const near = 1 - smoothstep(0, ctx.yRef * 0.9, Math.abs(y))
    const wave = Math.pow(Math.abs(Math.sin(th * o.pleats * 0.5 + noise2(th * 2, y * 0.1, o.seed) * 0.8)), 0.65) - 0.5
    r += o.pleatAmp * (0.35 + 0.65 * near) * wave
    r += o.crumple * fbm2(th * o.crumpleScale * 4 + o.seed, y * o.crumpleScale * 0.3, o.seed)
    r += 1.4 * Math.pow(smoothstep(0.78, 1, v), 2)
    if (!full) {
      const e = Math.min(th - o.t0, o.t1 - th) / span
      r += 0.6 * (1 - smoothstep(0, 0.07, e)) * v
    }
    out.p.set(Math.sin(th) * r, y, Math.cos(th) * r)
    const k = lerp(0.72, 1, smoothstep(-3, ctx.yRef * 0.55, y)) * o.shade * (1 + 0.04 * noise2(th * 9, y * 0.5, o.seed + 3))
    out.c = [k, k, k]
    out.uv = [(th / TAU) * 5, y / 22]
  })
}

export interface WrapGeometry {
  outer: BufferGeometry | null
  inner: BufferGeometry | null
  neckRadius: number
}

export function buildWrap(layout: BouquetLayout, pk: Packaging): WrapGeometry {
  const neckR = layout.bundleRadius + 0.55
  if (pk.wrapMaterial === 'none') return { outer: null, inner: null, neckRadius: layout.bundleRadius + 0.05 }

  const ctx: WrapContext = { neckR, rimR: layout.rimRadius, yRef: layout.rimY }
  const outer = new GeoBuilder(true)
  const inner = new GeoBuilder(true)
  const mat = pk.wrapMaterial
  const texture = {
    pleats: mat === 'clear' ? 14 : mat === 'fabric' ? 7 : 11,
    pleatAmp: mat === 'fabric' ? 0.9 : mat === 'clear' ? 0.5 : 0.42,
    crumple: mat === 'clear' ? 0.35 : mat === 'fabric' ? 0.05 : mat === 'kraft' ? 0.18 : 0.12,
    crumpleScale: mat === 'clear' ? 1.6 : 1,
  }
  const rim = layout.rimY

  if (pk.wrapShape === 'cone') {
    addSheet(outer, ctx, { t0: 0, t1: TAU, rimY: rim, peakAt: Math.PI, peak: 6, peakWidth: 1.7, wave: 0.8, rOffset: 0, bottomY: -20, taper: true, seed: 1, shade: 1, ...texture })
    if (mat !== 'clear') {
      addSheet(inner, ctx, { t0: 0.6, t1: TAU - 0.6, rimY: rim + 1, peakAt: Math.PI, peak: 7.5, peakWidth: 1.2, wave: 0.5, rOffset: -0.3, bottomY: -2, taper: false, seed: 2, shade: 1, ...texture, pleatAmp: texture.pleatAmp * 0.8 })
    }
    return { outer: outer.build(), inner: inner.isEmpty ? null : inner.build(), neckRadius: neckR + 0.45 }
  }

  if (pk.wrapShape === 'layered') {
    const sheets = [
      { c: Math.PI, peak: 5.5, off: 0 },
      { c: Math.PI - 2.1, peak: 2.4, off: 0.28 },
      { c: Math.PI + 2.1, peak: 2.4, off: 0.5 },
    ]
    sheets.forEach((s, i) =>
      addSheet(outer, ctx, { t0: s.c - 1.65, t1: s.c + 1.65, rimY: rim - 0.5, peakAt: s.c, peak: s.peak, peakWidth: 1.5, wave: 0.6, rOffset: s.off, bottomY: -9, taper: false, seed: 10 + i, shade: 1 - i * 0.03, ...texture }),
    )
    if (mat !== 'clear') {
      ;[Math.PI - 1.0, Math.PI + 1.0].forEach((c, i) =>
        addSheet(inner, ctx, { t0: c - 1.3, t1: c + 1.3, rimY: rim, peakAt: c, peak: 7, peakWidth: 1.1, wave: 0.4, rOffset: -0.3, bottomY: -3, taper: false, seed: 20 + i, shade: 1, ...texture, pleatAmp: texture.pleatAmp * 0.8 }),
      )
    }
    return { outer: outer.build(), inner: inner.isEmpty ? null : inner.build(), neckRadius: neckR + 0.95 }
  }

  // Önü açık: arka ve yanlar, altta saplara sarılan kısa bant
  addSheet(outer, ctx, { t0: 0.95, t1: TAU - 0.95, rimY: rim, peakAt: Math.PI, peak: 4.5, peakWidth: 1.8, wave: 0.6, rOffset: 0, bottomY: -8, taper: false, seed: 30, shade: 1, ...texture })
  addSheet(outer, { ...ctx, rimR: neckR + 1.2, yRef: 3 }, { t0: 0, t1: TAU, rimY: 2.5, rOffset: 0.2, bottomY: -8, taper: false, seed: 31, shade: 0.97, ...texture, pleatAmp: texture.pleatAmp * 0.6 })
  if (mat !== 'clear') {
    addSheet(inner, ctx, { t0: 1.25, t1: TAU - 1.25, rimY: rim + 0.5, peakAt: Math.PI, peak: 6, peakWidth: 1.3, wave: 0.4, rOffset: -0.3, bottomY: -2, taper: false, seed: 32, shade: 1, ...texture, pleatAmp: texture.pleatAmp * 0.8 })
  }
  return { outer: outer.build(), inner: inner.isEmpty ? null : inner.build(), neckRadius: neckR + 0.5 }
}

// ---------------------------------------------------------------------------
// Kurdele ve ip
// ---------------------------------------------------------------------------

export function buildRibbon(pk: Packaging, neckRadius: number): BufferGeometry | null {
  if (pk.ribbonStyle === 'none') return null
  const b = new GeoBuilder()
  const R = neckRadius
  const front = R + 0.35
  const shadeStrip = (_: number, s: number): RGB => {
    const k = 0.92 + 0.08 * (1 - Math.abs(s))
    return [k, k, k]
  }

  if (pk.ribbonStyle === 'twine') {
    const turns = 4
    const pts: Vector3[] = []
    for (let i = 0; i <= 96; i++) {
      const t = i / 96
      const a = t * turns * TAU
      pts.push(new Vector3(Math.sin(a) * (R + 0.05), lerp(-0.7, 0.9, t), Math.cos(a) * (R + 0.05)))
    }
    const fiber = (t: number): RGB => {
      const k = 0.82 + 0.18 * Math.abs(Math.sin(t * 900))
      return [k, k, k]
    }
    addTube(b, pts, 0.11, fiber, { tubular: 220, radial: 5 })
    if (pk.bow) {
      const k = new Vector3(0, 0.2, front)
      for (const side of [-1, 1]) {
        addTube(b, [k, new Vector3(side * 0.9, 1.0, front + 0.4), new Vector3(side * 2.2, 1.3, front + 0.7), new Vector3(side * 2.4, 0.3, front + 0.7), new Vector3(side * 1.2, -0.1, front + 0.4), k.clone().add(new Vector3(side * 0.1, 0, 0))], 0.1, fiber, { tubular: 40, radial: 5 })
        addTube(b, [k, new Vector3(side * 0.6, -2.0, front + 0.6), new Vector3(side * 1.1, -4.6, front + 0.4)], 0.1, fiber, { tubular: 24, radial: 5 })
      }
    }
    return b.build()
  }

  const width = pk.ribbonStyle === 'satin' ? 2.1 : 1.6
  const band = (y: number, extra: number) => {
    const pts: Vector3[] = []
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU
      pts.push(new Vector3(Math.sin(a) * (R + extra), y + 0.12 * Math.sin(2 * a), Math.cos(a) * (R + extra)))
    }
    addRibbonStrip(b, pts, width, () => new Vector3(0, 1, 0), shadeStrip, { segments: 72, closed: true })
  }
  band(0.35, 0.05)
  band(-0.25, 0.12)

  if (pk.bow) {
    const K = new Vector3(0, 0.25, front + 0.1)
    for (const side of [-1, 1]) {
      const loop = [
        K.clone(),
        new Vector3(side * 1.4, 1.2, front + 0.8),
        new Vector3(side * 3.6, 2.4, front + 1.5),
        new Vector3(side * 4.6, 1.1, front + 1.8),
        new Vector3(side * 3.8, -0.4, front + 1.4),
        new Vector3(side * 1.5, -0.3, front + 0.8),
        K.clone().add(new Vector3(side * 0.15, -0.05, 0.05)),
      ]
      addRibbonStrip(b, loop, (t) => width * (0.82 + 0.18 * Math.sin(t * Math.PI)), (t) => new Vector3(side * 0.15 * Math.sin(t * TAU), 0.25, 1), shadeStrip, { segments: 56 })
      const tail = [
        K.clone().add(new Vector3(side * 0.3, -0.3, 0.15)),
        new Vector3(side * 1.1, -3.4, front + 1.1),
        new Vector3(side * 2.0, -7.2, front + 0.9),
        new Vector3(side * 2.7, -10.6, front + 0.55),
      ]
      addRibbonStrip(b, tail, width * 0.95, (t) => new Vector3(1, 0, side * (0.25 + 0.3 * t)), shadeStrip, { segments: 40, endCut: width * 0.45 })
    }
    const knot: Vector3[] = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      knot.push(new Vector3(0, K.y + Math.cos(a) * 0.62, K.z + 0.35 + Math.sin(a) * 0.5))
    }
    addRibbonStrip(b, knot, width * 0.7, () => new Vector3(1, 0, 0), shadeStrip, { segments: 36, closed: true })
  }
  return b.build()
}
