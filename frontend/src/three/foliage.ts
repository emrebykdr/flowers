import { BufferGeometry, CatmullRomCurve3, Matrix4, Vector3 } from 'three'
import type { FlowerType } from '../domain/types'
import { addDisc, addPetal, addTube, basisMatrix, combine, GeoBuilder, place, profiles } from './geometry'
import type { BouquetLayout } from './layout'
import { hexToLinear, lerp, mixRgb, range, rng, smoothstep, type RGB } from './math'

const lin = hexToLinear

interface LeafSpot {
  /** Baştan aşağı sap boyunca uzaklık (cm). */
  d: number
  /** Sap çevresindeki açı (radyan). */
  az: number
  kind: LeafKind
  scale?: number
}

type LeafKind = 'rose' | 'lance' | 'narrow' | 'broad' | 'heart' | 'lobed' | 'small' | 'strap'

const LEAVES: Partial<Record<FlowerType, LeafSpot[]>> = {
  rose: [
    { d: 5, az: 0.3, kind: 'rose' },
    { d: 9, az: 2.9, kind: 'rose', scale: 0.9 },
  ],
  tulip: [{ d: 13, az: 1, kind: 'strap' }],
  daisy: [{ d: 6, az: 1.2, kind: 'small' }],
  sunflower: [{ d: 5, az: 0.6, kind: 'heart' }],
  peony: [{ d: 5, az: 2, kind: 'lobed' }],
  lily: [
    { d: 3.5, az: 0, kind: 'lance', scale: 0.7 },
    { d: 5.5, az: 2.4, kind: 'lance', scale: 0.8 },
    { d: 7.5, az: 4.8, kind: 'lance', scale: 0.9 },
    { d: 9.5, az: 1.0, kind: 'lance' },
  ],
  hydrangea: [
    { d: 2.5, az: 0.4, kind: 'broad' },
    { d: 2.5, az: 0.4 + Math.PI, kind: 'broad' },
  ],
  carnation: [
    { d: 6, az: 0, kind: 'narrow' },
    { d: 6, az: Math.PI, kind: 'narrow' },
    { d: 11, az: 1.6, kind: 'narrow', scale: 0.85 },
    { d: 11, az: 1.6 + Math.PI, kind: 'narrow', scale: 0.85 },
  ],
}

/** Yaprak şablonu: taban orijinde, +Y boyunca uzar. Renkler mutlak. */
function leafTemplate(kind: LeafKind, variant: number): (b: GeoBuilder, m: Matrix4) => void {
  const r = rng(500 + variant * 17 + kind.length * 3)
  const dark = lin('#3b5a2a')
  const light = lin('#5d7f3e')
  const shade = (u: number, s: number): RGB => {
    const vein = 1 - Math.min(1, Math.abs(s) * 6)
    return mixRgb(mixRgb(dark, light, u * 0.6), lin('#88a565'), vein * 0.5)
  }
  switch (kind) {
    case 'rose':
      return (b, m) => {
        addTube(b, [new Vector3(0, 0, 0), new Vector3(0, 1.8, 0.2), new Vector3(0, 3.4, 0.5)], 0.06, dark, { tubular: 6, radial: 4, matrix: m })
        const leaflet = (y: number, az: number, scale: number) =>
          addPetal(b, {
            length: 2.2 * scale,
            width: 1.35 * scale,
            segU: 7,
            segV: 4,
            profile: profiles.leaf,
            open: 1.0,
            curve: (u) => 0.25 * u,
            fold: 0.18,
            serration: 0.12,
            serrationTeeth: 9,
            seed: Math.round(y * 10),
            shade: (u, s) => mixRgb(shade(u, s), lin('#2f4a22'), 0.25),
          }, combine(m, new Matrix4().makeTranslation(0, y, 0.1 + y * 0.12), place(az, 0, 0)))
        leaflet(1.3, Math.PI / 2, 0.8)
        leaflet(1.3, -Math.PI / 2, 0.8)
        leaflet(2.4, Math.PI / 2, 0.9)
        leaflet(2.4, -Math.PI / 2, 0.9)
        addPetal(b, {
          length: 2.4,
          width: 1.5,
          segU: 7,
          segV: 4,
          profile: profiles.leaf,
          open: 0.25,
          curve: (u) => 0.4 * u,
          fold: 0.2,
          serration: 0.12,
          serrationTeeth: 9,
          shade: (u, s) => mixRgb(shade(u, s), lin('#2f4a22'), 0.25),
        }, combine(m, new Matrix4().makeTranslation(0, 3.3, 0.5)))
      }
    case 'lance':
    case 'narrow':
    case 'strap':
    case 'small': {
      const spec = {
        lance: { length: 6, width: 1.1, curve: 0.5 },
        narrow: { length: 5.5, width: 0.45, curve: 0.7 },
        strap: { length: 11, width: 2.4, curve: 0.6 },
        small: { length: 2.8, width: 0.9, curve: 0.35 },
      }[kind]
      return (b, m) =>
        addPetal(b, {
          length: spec.length * range(r, 0.92, 1.05),
          width: spec.width,
          segU: kind === 'strap' ? 10 : 8,
          segV: 3,
          profile: profiles.leaf,
          open: 0.55,
          curve: (u) => spec.curve * u,
          fold: spec.width * 0.15,
          twist: 0.3,
          shade: (u, s) => (kind === 'narrow' ? mixRgb(shade(u, s), lin('#7f9c86'), 0.55) : shade(u, s)),
        }, m)
    }
    case 'broad':
    case 'heart':
      return (b, m) =>
        addPetal(b, {
          length: kind === 'broad' ? 7 : 6.5,
          width: kind === 'broad' ? 4.4 : 5.2,
          segU: 10,
          segV: 6,
          profile: kind === 'broad' ? profiles.oval : (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.75))), 0.7),
          open: 1.05,
          curve: (u) => 0.45 * u,
          fold: 0.5,
          serration: 0.06,
          serrationTeeth: 14,
          crinkle: 0.08,
          shade,
        }, m)
    case 'lobed':
      return (b, m) => {
        for (const az of [-0.55, 0, 0.55]) {
          addPetal(b, {
            length: az === 0 ? 4.8 : 4.0,
            width: 1.6,
            segU: 8,
            segV: 4,
            profile: profiles.leaf,
            open: 0.9 + Math.abs(az) * 0.3,
            curve: (u) => 0.4 * u,
            fold: 0.25,
            shade,
          }, combine(m, new Matrix4().makeRotationZ(az)))
        }
      }
  }
}

function eucalyptus(b: GeoBuilder, m: Matrix4, length: number, variant: number) {
  const r = rng(700 + variant * 13)
  const pts = [new Vector3(0, 0, 0), new Vector3(0.3, length * 0.35, 0.4), new Vector3(0.2, length * 0.7, 1.1), new Vector3(-0.2, length, 1.6)]
  const stemColor = lin('#7c8f73')
  addTube(b, pts, (t) => lerp(0.09, 0.04, t), stemColor, { tubular: 12, radial: 4, matrix: m })
  const curve = new CatmullRomCurve3(pts)
  const leaf = lin('#8aa294')
  const leafDark = lin('#6f8a7c')
  const pairs = Math.floor(length / 1.7)
  for (let i = 1; i <= pairs; i++) {
    const t = i / (pairs + 0.6)
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const size = lerp(1.05, 0.55, t) * range(r, 0.9, 1.1)
    const frame = basisMatrix(p, tan, new Vector3(1, 0, 0))
    const az0 = (i % 2) * (Math.PI / 2)
    for (const side of [0, Math.PI]) {
      const tone = range(r, 0, 1)
      addPetal(b, {
        length: 1.7 * size,
        width: 1.55 * size,
        segU: 5,
        segV: 4,
        profile: profiles.disc,
        open: range(r, 0.9, 1.25),
        curve: (u) => 0.2 * u,
        cup: 0.12,
        shade: (u) => mixRgb(leafDark, leaf, lerp(tone, 1, u * 0.5)),
      }, combine(m, frame, place(az0 + side, 0.05, 0)))
    }
  }
}

function ruscus(b: GeoBuilder, m: Matrix4, length: number, variant: number) {
  const r = rng(800 + variant * 19)
  const pts = [new Vector3(0, 0, 0), new Vector3(0, length * 0.5, 0.8), new Vector3(0, length, 2.4)]
  const green = lin('#4e6b37')
  addTube(b, pts, (t) => lerp(0.08, 0.03, t), green, { tubular: 10, radial: 4, matrix: m })
  const curve = new CatmullRomCurve3(pts)
  const n = Math.floor(length / 1.3)
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 0.5)
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const frame = basisMatrix(p, tan, new Vector3(1, 0, 0))
    const size = lerp(1, 0.6, t)
    addPetal(b, {
      length: 2.4 * size,
      width: 0.9 * size,
      segU: 5,
      segV: 3,
      profile: profiles.leaf,
      open: range(r, 0.7, 1.0),
      curve: (u) => 0.2 * u,
      fold: 0.1,
      shade: (u) => mixRgb(green, lin('#6a8a4b'), u * 0.6),
    }, combine(m, frame, place((i % 2) * Math.PI + range(r, -0.3, 0.3), 0.04, 0)))
  }
}

export interface FoliageGeometry {
  stems: BufferGeometry
  leaves: BufferGeometry
}

/** Bütün saplar ve yapraklar iki çizim çağrısında. Renkler köşelerde mutlak. */
export function buildFoliage(layout: BouquetLayout): FoliageGeometry {
  const stems = new GeoBuilder()
  const leaves = new GeoBuilder()
  const cut = lin('#c9d3a3')

  layout.stems.forEach((s, idx) => {
    const radius = s.stemRadius
    const r = rng(idx * 31 + 7)
    const tone = range(r, 0.85, 1.08)
    const base: RGB = [s.stemColor[0] * tone, s.stemColor[1] * tone, s.stemColor[2] * tone]
    const deep: RGB = [base[0] * 0.75, base[1] * 0.75, base[2] * 0.7]
    addTube(stems, s.stem, (t) => radius * lerp(1.12, 0.95, t), (t) => mixRgb(deep, base, smoothstep(0, 0.4, t)), {
      tubular: 22,
      radial: 6,
    })
    const curve = new CatmullRomCurve3(s.stem, false, 'centripetal')
    const start = curve.getPointAt(0)
    addDisc(stems, start, curve.getTangentAt(0).negate(), radius * 1.1, cut)

    const spots = LEAVES[s.type]
    if (!spots) return
    const len = curve.getLength()
    for (const spot of spots) {
      const t = 1 - (spot.d * s.scale) / len
      if (t < 0.3) continue
      const p = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      const side = new Vector3(Math.cos(spot.az + idx), 0.2, Math.sin(spot.az + idx))
      const frame = basisMatrix(p, tan, side, (spot.scale ?? 1) * Math.min(1.15, s.scale))
      const tilt = new Matrix4().makeRotationX(spot.kind === 'rose' ? 0.75 : 0)
      leafTemplate(spot.kind, idx % 3)(leaves, combine(frame, tilt))
    }
  })

  layout.sprigs.forEach((sp, i) => {
    addTube(stems, sp.stem, 0.08, lin(sp.kind === 'eucalyptus' ? '#7c8f73' : '#4e6b37'), { tubular: 16, radial: 4 })
    const m = basisMatrix(sp.base, sp.dir, sp.outward)
    if (sp.kind === 'eucalyptus') eucalyptus(leaves, m, sp.length, sp.variant + i)
    else ruscus(leaves, m, sp.length, sp.variant + i)
  })

  return { stems: stems.build(), leaves: leaves.build() }
}
