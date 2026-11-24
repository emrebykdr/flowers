import { BufferGeometry, Matrix4, Vector3 } from 'three'
import type { FlowerType } from '../domain/types'
import {
  addEllipsoid,
  addLathe,
  addPetal,
  addTube,
  basisMatrix,
  combine,
  GeoBuilder,
  place,
  profiles,
} from './geometry'
import { GOLDEN_ANGLE, hexToLinear, lerp, mixRgb, range, rng, smoothstep, TAU, type RGB, type Rng } from './math'

/**
 * Çiçek başları yerel uzayda kurulur: +Y çiçeğin baktığı yön, orijin sapın bittiği nokta, birim cm.
 * 'petal' parçaları kullanıcının seçtiği renkle çarpılır (köşe renkleri burada gölge/ton çarpanıdır),
 * 'fixed' parçalar kendi rengini taşır (göbek, yeşil kısımlar).
 */
export type PartKind = 'petal' | 'petal2' | 'fixed'

export interface HeadPart {
  kind: PartKind
  geometry: BufferGeometry
}

export interface HeadModel {
  parts: HeadPart[]
  /** Yerleşim için yaklaşık yarıçap (cm). */
  radius: number
  /** Başın yüksekliği (cm). */
  height: number
}

const lin = hexToLinear
const gray = (k: number): RGB => [k, k, k]
const I = new Matrix4()

function model(radius: number, height: number, parts: [PartKind, GeoBuilder][]): HeadModel {
  return {
    radius,
    height,
    parts: parts.filter(([, b]) => !b.isEmpty).map(([kind, b]) => ({ kind, geometry: b.build() })),
  }
}

// ---------------------------------------------------------------------------

function rose(variant: number, r: Rng): HeadModel {
  const openness = [0.62, 0.88, 0.38][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const N = 24
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const length = lerp(1.9, 3.8, Math.pow(t, 0.55)) * range(r, 0.95, 1.05)
    const width = lerp(2.1, 4.1, Math.pow(t, 0.6)) * range(r, 0.94, 1.06)
    const open = lerp(0.06, lerp(0.55, 1.2, openness), Math.pow(t, 1.7)) + range(r, -0.05, 0.05)
    const back = lerp(-0.32, lerp(0.4, 1.15, openness), Math.pow(t, 1.3))
    const r0 = lerp(0.12, 0.95, Math.pow(t, 0.75))
    const h0 = lerp(1.35, 0.75, t)
    const az = i * GOLDEN_ANGLE + range(r, -0.15, 0.15)
    const depth = lerp(0.8, 1, t)
    addPetal(petals, {
      length,
      width,
      segU: 9,
      segV: 8,
      profile: profiles.round,
      open,
      curve: (u) => back * smoothstep(0.3, 1, u),
      cup: width * lerp(0.36, 0.22, t),
      cupProfile: (u) => 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)),
      roll: lerp(0, 0.95, Math.pow(t, 1.5)) * openness,
      crinkle: 0.05,
      crinkleScale: 0.8,
      seed: i + variant * 50,
      shade: (u) => gray(lerp(0.5, 1, smoothstep(0, 0.72, u)) * depth),
    }, place(az, r0, h0))
  }
  const green = lin('#3f5f2c')
  addEllipsoid(fixed, new Vector3(0, 0.55, 0), [0.78, 0.7, 0.78], (_, v) => mixRgb(green, lin('#58783a'), v))
  for (let k = 0; k < 5; k++) {
    addPetal(fixed, {
      length: 2.3,
      width: 0.62,
      segU: 6,
      segV: 3,
      profile: profiles.lance,
      open: 1.75 + range(r, -0.1, 0.1),
      curve: (u) => 0.9 * u,
      cup: 0.1,
      seed: k,
      shade: () => green,
    }, place((k * TAU) / 5 + 0.3, 0.45, 0.62))
  }
  return model(lerp(3.2, 4.2, openness), 4.6, [['petal', petals], ['fixed', fixed]])
}

function tulip(variant: number, r: Rng): HeadModel {
  const openness = [0.22, 0.5, 0.08][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  for (let k = 0; k < 6; k++) {
    const outer = k % 2 === 0
    const az = (k * TAU) / 6 + range(r, -0.08, 0.08)
    const flare = 0.3 + openness * 0.6
    addPetal(petals, {
      length: (outer ? 5.4 : 5.0) * range(r, 0.97, 1.03),
      width: outer ? 3.9 : 3.6,
      segU: 12,
      segV: 9,
      profile: profiles.oval,
      open: (outer ? 0.2 : 0.1) + openness * 0.35,
      curve: (u) => -0.22 * u + flare * smoothstep(0.62, 1, u),
      cup: outer ? 1.35 : 1.2,
      cupProfile: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.9)), 0.6),
      crinkle: 0.03,
      seed: k + variant * 10,
      shade: (u) => {
        const t = smoothstep(0, 0.34, u)
        return [lerp(0.72, 1, t), lerp(0.8, 1, t), lerp(0.55, 1, t)]
      },
    }, place(az, outer ? 0.62 : 0.4, 0.3))
  }
  addLathe(fixed, [[0.01, 0.2], [0.26, 0.3], [0.28, 1.1], [0.38, 1.4], [0.01, 1.55]], 10, I, lin('#c8d38a'))
  const dark = lin('#2d2622')
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6 + 0.5
    addTube(fixed, [new Vector3(0, 0.3, 0), new Vector3(Math.cos(a) * 0.4, 1.0, Math.sin(a) * 0.4)], 0.04, lin('#d8d2b0'), { radial: 4, tubular: 2 })
    addEllipsoid(fixed, new Vector3(Math.cos(a) * 0.45, 1.3, Math.sin(a) * 0.45), [0.08, 0.38, 0.12], dark, { segW: 5, segH: 4 })
  }
  addEllipsoid(fixed, new Vector3(0, 0.15, 0), [0.6, 0.45, 0.6], lin('#6f8f4e'))
  return model(2.6 + openness * 1.2, 5.6, [['petal', petals], ['fixed', fixed]])
}

function daisy(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const N = 22 + variant * 2
  for (let i = 0; i < N; i++) {
    const layer = i % 2
    const az = (i / N) * TAU + range(r, -0.05, 0.05)
    const droop = range(r, 0.1, 0.45)
    addPetal(petals, {
      length: range(r, 2.5, 2.9),
      width: range(r, 0.5, 0.6),
      segU: 8,
      segV: 3,
      profile: profiles.strap,
      open: (layer ? 1.32 : 1.44) + range(r, -0.06, 0.06),
      curve: (u) => droop * u * u,
      cup: 0.08,
      twist: range(r, -0.3, 0.3),
      crinkle: 0.015,
      seed: i,
      shade: (u) => gray(lerp(0.84, 1, smoothstep(0, 0.3, u))),
    }, place(az, 0.68, 0.32 + layer * 0.05))
  }
  const inner = lin('#c9971b')
  const outer = lin('#f2c53d')
  addLathe(fixed, [[0.01, 0.66], [0.3, 0.63], [0.55, 0.55], [0.72, 0.42], [0.8, 0.26], [0.74, 0.12]], 26, I,
    (_, a, rad) => {
      const n = 0.85 + 0.15 * Math.sin(a * 21 + rad * 30)
      const c = mixRgb(inner, outer, smoothstep(0.1, 0.75, rad))
      return [c[0] * n, c[1] * n, c[2] * n]
    })
  addLathe(fixed, [[0.01, -0.05], [0.5, 0.02], [0.78, 0.18], [0.82, 0.24]], 18, I, lin('#5f7d3f'))
  return model(3.3, 1.2, [['petal', petals], ['fixed', fixed]])
}

function orchidBloom(petals: GeoBuilder, lip: GeoBuilder, fixed: GeoBuilder, m: Matrix4, seed: number) {
  const r = rng(seed)
  const parts: { az: number; length: number; width: number; profile: (u: number) => number; open: number; cup: number }[] = [
    { az: 0, length: 3.2, width: 1.7, profile: profiles.oval, open: 1.42, cup: 0.25 },
    { az: Math.PI - 0.62, length: 3.1, width: 1.55, profile: profiles.oval, open: 1.45, cup: 0.22 },
    { az: Math.PI + 0.62, length: 3.1, width: 1.55, profile: profiles.oval, open: 1.45, cup: 0.22 },
    { az: 1.35, length: 3.2, width: 3.5, profile: profiles.wide, open: 1.5, cup: 0.3 },
    { az: -1.35, length: 3.2, width: 3.5, profile: profiles.wide, open: 1.5, cup: 0.3 },
  ]
  parts.forEach((p, i) => {
    addPetal(petals, {
      length: p.length * range(r, 0.96, 1.04),
      width: p.width,
      segU: 8,
      segV: 8,
      profile: p.profile,
      open: p.open,
      curve: (u) => 0.14 * u,
      cup: p.cup,
      ruffle: i >= 3 ? 0.06 : 0.02,
      seed: seed + i,
      shade: (u) => gray(lerp(0.86, 1, smoothstep(0, 0.4, u))),
    }, combine(m, place(p.az, 0.15, 0.25)))
  })
  addPetal(lip, {
    length: 1.9,
    width: 1.3,
    segU: 7,
    segV: 6,
    profile: profiles.oval,
    open: 1.0,
    curve: (u) => -0.55 * u,
    cup: 0.65,
    seed: seed + 9,
    shade: (u) => gray(lerp(0.75, 1, u)),
  }, combine(m, place(Math.PI, 0.2, 0.45)))
  for (const side of [-1, 1]) {
    addPetal(lip, {
      length: 1.0,
      width: 0.7,
      segU: 5,
      segV: 4,
      profile: profiles.oval,
      open: 0.55,
      curve: (u) => -0.4 * u,
      cup: 0.25,
      shade: () => gray(0.9),
    }, combine(m, place(Math.PI + side * 0.55, 0.25, 0.45)))
  }
  const column = new Vector3(0, 0.55, 0.3).applyMatrix4(m)
  const colUp = new Vector3(0, 0.55, 1).transformDirection(m)
  addEllipsoid(fixed, column, [0.22, 0.5, 0.26], lin('#f2eee4'), { up: colUp, segW: 6, segH: 5 })
  const callus = new Vector3(0, 0.5, -0.45).applyMatrix4(m)
  addEllipsoid(fixed, callus, [0.16, 0.12, 0.2], lin('#e7c13d'), { segW: 6, segH: 4 })
}

function orchid(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const lip = new GeoBuilder()
  const fixed = new GeoBuilder()
  const arch = [1, 1.15, 0.9][variant]
  const spine = [
    new Vector3(0, 0, 0),
    new Vector3(0, 3.5, 0.5 * arch),
    new Vector3(0, 6.4, 2.4 * arch),
    new Vector3(0.2, 8.0, 5.2 * arch),
    new Vector3(0.1, 7.8, 8.4 * arch),
    new Vector3(-0.2, 6.4, 11 * arch),
  ]
  const stemGreen = lin('#5f6d3a')
  addTube(fixed, spine, (t) => lerp(0.15, 0.07, t), stemGreen, { tubular: 30, radial: 6 })

  // Spine'ı yeniden örneklemek için basit Catmull-Rom yaklaşık değerlendirme
  const sample = (t: number) => {
    const f = t * (spine.length - 1)
    const i = Math.min(spine.length - 2, Math.floor(f))
    return spine[i].clone().lerp(spine[i + 1], f - i)
  }

  const blooms = [0.42, 0.6, 0.76]
  blooms.forEach((t, i) => {
    const anchor = sample(t)
    const side = i % 2 === 0 ? 1 : -1
    const face = new Vector3(side * 0.35, -0.12, 1).normalize()
    const pos = anchor.clone().add(new Vector3(side * 1.0, -1.3, 0.6))
    addTube(fixed, [anchor, anchor.clone().lerp(pos, 0.5).add(new Vector3(0, 0.2, 0)), pos], 0.06, stemGreen, { tubular: 6, radial: 4 })
    const scale = lerp(1, 0.86, i / 2) * range(r, 0.96, 1.04)
    const m = basisMatrix(pos, face, new Vector3(0, 1, 0), scale)
    orchidBloom(petals, lip, fixed, m, variant * 100 + i * 7)
  })
  ;[0.87, 0.94, 1.0].forEach((t, i) => {
    const anchor = sample(t)
    const size = lerp(0.62, 0.36, i / 2)
    const pos = anchor.clone().add(new Vector3(0, -0.6 - size, 0.2))
    addTube(fixed, [anchor, pos], 0.05, stemGreen, { tubular: 2, radial: 4 })
    addEllipsoid(petals, pos, [size, size * 1.25, size], (_, v) => [lerp(0.7, 0.95, v), lerp(0.85, 1, v), lerp(0.65, 0.9, v)], { segW: 8, segH: 6 })
  })
  return model(5.2, 8.5, [['petal', petals], ['petal2', lip], ['fixed', fixed]])
}

function sunflower(variant: number, r: Rng): HeadModel {
  const R = [2.3, 2.5, 2.1][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const dark = lin('#2f1d0f')
  const mid = lin('#4a2d14')
  const rim = lin('#7a5418')
  const rows = 10
  fixed.grid(rows + 1, 41, (i, j, out) => {
    const rr = (i / rows) * R
    const a = (j / 40) * TAU
    out.p.set(Math.cos(a) * rr, 0.62 - 0.16 * Math.pow(rr / R, 2) + 0.06 * Math.sin(rr * 9), Math.sin(a) * rr)
    out.c = mixRgb(mixRgb(dark, mid, smoothstep(0, 0.6, rr / R)), rim, smoothstep(0.75, 1, rr / R))
  })
  const seeds = 230
  for (let i = 0; i < seeds; i++) {
    const t = Math.sqrt((i + 0.5) / seeds)
    const rr = R * 0.94 * t
    const a = i * GOLDEN_ANGLE
    const y = 0.62 - 0.16 * t * t + 0.04
    const c = t > 0.8 ? mixRgb(rim, lin('#a87a22'), range(r, 0, 1)) : mixRgb(dark, mid, range(r, 0, 1))
    addEllipsoid(fixed, new Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), [0.1, 0.07, 0.1], c, { segW: 4, segH: 3 })
  }
  for (let layer = 0; layer < 2; layer++) {
    const n = 20
    for (let i = 0; i < n; i++) {
      const az = ((i + layer * 0.5) / n) * TAU + range(r, -0.05, 0.05)
      const droop = range(r, 0.05, 0.4)
      addPetal(petals, {
        length: range(r, 3.0, 3.6) * (layer ? 0.95 : 1),
        width: range(r, 1.05, 1.25),
        segU: 9,
        segV: 4,
        profile: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.7))), 0.75),
        open: (layer ? 1.62 : 1.48) + range(r, -0.08, 0.08),
        curve: (u) => droop * Math.pow(u, 1.5),
        cup: 0.22,
        twist: range(r, -0.35, 0.35),
        crinkle: 0.04,
        seed: i + layer * 40,
        shade: (u) => gray(lerp(0.82, 1, smoothstep(0, 0.35, u)) * (layer ? 0.9 : 1)),
      }, place(az, R * 0.96, 0.5 - layer * 0.08))
    }
  }
  const bract = lin('#4b6a2c')
  for (let i = 0; i < 16; i++) {
    addPetal(fixed, {
      length: 1.7,
      width: 0.85,
      segU: 5,
      segV: 3,
      profile: profiles.lance,
      open: 1.95 + range(r, -0.1, 0.1),
      curve: (u) => 0.3 * u,
      cup: 0.1,
      shade: () => bract,
    }, place((i / 16) * TAU + 0.1, R * 0.75, 0.2))
  }
  addLathe(fixed, [[0.5, -0.5], [1.2, -0.3], [R * 0.9, 0.05], [R * 0.98, 0.3]], 24, I, lin('#5a7a35'))
  return model(R + 3.3, 1.6, [['petal', petals], ['fixed', fixed]])
}

function peony(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const fullness = [1, 1.08, 0.9][variant]
  for (let g = 0; g < 7; g++) {
    const az = (g * TAU) / 7 + range(r, -0.1, 0.1)
    addPetal(petals, {
      length: 4.0 * fullness,
      width: 4.6 * fullness,
      segU: 10,
      segV: 10,
      profile: profiles.wide,
      open: range(r, 1.0, 1.25),
      curve: (u) => 0.4 * smoothstep(0.4, 1, u),
      cup: 1.5,
      ruffle: 0.12,
      ruffleFreq: 3,
      crinkle: 0.14,
      crinkleScale: 1.2,
      seed: g + variant * 30,
      shade: (u) => gray(lerp(0.72, 1, smoothstep(0, 0.6, u))),
    }, place(az, 1.5, 0.55))
  }
  const N = 50
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const inc = lerp(-0.7, 0.05, t)
    addPetal(petals, {
      length: lerp(1.5, 3.1, Math.pow(t, 0.8)) * fullness,
      width: lerp(1.7, 3.2, Math.pow(t, 0.8)) * fullness,
      segU: 7,
      segV: 7,
      profile: profiles.oval,
      open: lerp(0.05, 0.85, Math.pow(t, 1.4)) + range(r, -0.08, 0.08),
      curve: (u) => inc * u,
      cup: lerp(1.0, 1.2, t),
      crinkle: 0.18,
      crinkleScale: 1.4,
      ruffle: 0.08,
      ruffleFreq: 4,
      seed: i + 100,
      shade: (u) => gray(lerp(0.66, 1, smoothstep(0, 0.8, u)) * lerp(0.86, 1, t)),
    }, place(i * GOLDEN_ANGLE + range(r, -0.2, 0.2), lerp(0.1, 1.35, Math.sqrt(t)), lerp(2.0, 1.0, t)))
  }
  const green = lin('#4c6a35')
  for (let k = 0; k < 5; k++) {
    addPetal(fixed, {
      length: 2,
      width: 1.6,
      segU: 5,
      segV: 4,
      profile: profiles.oval,
      open: 1.9,
      curve: (u) => 0.3 * u,
      cup: 0.4,
      shade: () => green,
    }, place((k * TAU) / 5, 0.6, 0.3))
  }
  addEllipsoid(fixed, new Vector3(0, 0.45, 0), [1.0, 0.6, 1.0], green)
  return model(5.2 * fullness, 5.5, [['petal', petals], ['fixed', fixed]])
}

function lily(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const throat: RGB = [0.8, 0.92, 0.6]
  for (let k = 0; k < 6; k++) {
    const outer = k % 2 === 0
    const recurve = (outer ? 1.85 : 1.7) + range(r, -0.15, 0.15)
    addPetal(petals, {
      length: outer ? 6.6 : 6.3,
      width: outer ? 2.0 : 2.5,
      segU: 14,
      segV: 8,
      profile: profiles.lance,
      open: 0.42,
      curve: (u) => recurve * Math.pow(u, 1.7),
      cup: 0.5,
      cupProfile: (u) => Math.pow(Math.sin(Math.PI * u), 0.8),
      ruffle: 0.12,
      ruffleFreq: 4,
      roll: 0.15,
      crinkle: 0.03,
      seed: k + variant * 20,
      shade: (u, s) => {
        const t = 1 - smoothstep(0, 0.32, u)
        const c = mixRgb([1, 1, 1], throat, t * 0.9)
        const edge = 1 - 0.05 * Math.abs(s)
        return [c[0] * edge, c[1] * edge, c[2] * edge]
      },
    }, place((k * TAU) / 6 + range(r, -0.06, 0.06), 0.28, 0.35))
  }
  const filament = lin('#d6e0b0')
  const anther = lin('#8a3d16')
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6 + 0.4
    const c = Math.cos(a)
    const s = Math.sin(a)
    const pts = [
      new Vector3(0, 0.5, 0),
      new Vector3(0.4 * c, 2.5, 0.4 * s),
      new Vector3(1.0 * c, 4.2, 1.0 * s),
      new Vector3(1.5 * c, 5.0, 1.5 * s),
    ]
    addTube(fixed, pts, 0.045, filament, { tubular: 10, radial: 4 })
    addEllipsoid(fixed, pts[3].clone().add(new Vector3(0, 0.1, 0)), [0.13, 0.5, 0.13], anther, { up: new Vector3(-s, 0.2, c), segW: 6, segH: 4 })
  }
  addTube(fixed, [new Vector3(0, 0.5, 0), new Vector3(0, 3, 0.2), new Vector3(0, 5.4, 0.5)], 0.07, lin('#c8d89a'), { tubular: 10, radial: 5 })
  addEllipsoid(fixed, new Vector3(0, 5.5, 0.55), [0.24, 0.18, 0.24], lin('#7d8f3e'), { segW: 6, segH: 4 })
  addEllipsoid(fixed, new Vector3(0, 0.25, 0), [0.55, 0.45, 0.55], lin('#58773a'))

  if (variant > 0) {
    const base = new Vector3(1.6, -2.2, 0.9)
    const tip = base.clone().add(new Vector3(0.9, 3.4, 0.5))
    addTube(fixed, [new Vector3(0, -3.2, 0), new Vector3(0.8, -2.8, 0.45), base], 0.12, lin('#58773a'), { tubular: 8, radial: 5 })
    const dir = tip.clone().sub(base).normalize()
    const center = base.clone().addScaledVector(dir, 1.9)
    addEllipsoid(petals, center, [0.72, 2.0, 0.72], (_, v) => mixRgb([0.72, 0.86, 0.6], [1, 1, 0.94], smoothstep(0.1, 0.9, v)), { up: dir, segW: 10, segH: 8 })
  }
  return model(5.4, 6, [['petal', petals], ['fixed', fixed]])
}

function lavender(variant: number, r: Rng): HeadModel {
  const H = [7.5, 6.6, 8.4][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const whorls = 13
  for (let k = 0; k < whorls; k++) {
    const t = k / (whorls - 1)
    const y = H * Math.pow(t, 0.8) + 0.3
    const n = t > 0.85 ? 4 : t > 0.6 ? 6 : 7
    const rad = lerp(0.36, 0.18, t)
    for (let f = 0; f < n; f++) {
      const az = (f / n) * TAU + k * 0.5 + range(r, -0.2, 0.2)
      const c = Math.cos(az)
      const s = Math.sin(az)
      const k2 = range(r, 0.68, 1)
      addEllipsoid(
        petals,
        new Vector3(c * rad, y + range(r, -0.12, 0.12), s * rad),
        [0.15, 0.34 * lerp(1, 0.8, t), 0.15],
        (_, v) => [k2 * lerp(0.75, 1, v), k2 * lerp(0.75, 1, v), k2 * lerp(0.82, 1, v)],
        { up: new Vector3(c * 0.6, 0.8, s * 0.6), segW: 6, segH: 4 },
      )
    }
  }
  addTube(fixed, [new Vector3(0, 0, 0), new Vector3(0, H * 0.5, 0), new Vector3(0, H + 0.5, 0)], (t) => lerp(0.09, 0.05, t), lin('#7b8a66'), { tubular: 8, radial: 5 })
  return model(1.0, H, [['petal', petals], ['fixed', fixed]])
}

function hydrangea(variant: number, r: Rng): HeadModel {
  const R = [5.0, 4.6, 5.5][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const center = new Vector3(0, R * 0.72, 0)
  addEllipsoid(fixed, center, [R * 0.8, R * 0.78, R * 0.8], lin('#45582f'), { segW: 14, segH: 10 })
  const N = 96
  const maxPolar = 1.95
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const polar = Math.acos(1 - t * (1 - Math.cos(maxPolar)))
    const az = i * GOLDEN_ANGLE
    const n = new Vector3(Math.sin(polar) * Math.cos(az), Math.cos(polar), Math.sin(polar) * Math.sin(az))
    const pos = center.clone().addScaledVector(n, R + range(r, -0.3, 0.25))
    const m = basisMatrix(pos, n, new Vector3(Math.cos(az + 1), 0.3, Math.sin(az + 1)))
    const base = range(r, 0.8, 1)
    const tint = range(r, 0, 1) > 0.75 ? range(r, 0.15, 0.4) : 0
    const color: RGB = mixRgb(gray(base), [0.82 * base, 1, 0.78 * base], tint)
    const spin = range(r, 0, TAU)
    for (let k = 0; k < 4; k++) {
      addPetal(petals, {
        length: range(r, 1.0, 1.2),
        width: range(r, 0.95, 1.1),
        segU: 5,
        segV: 4,
        profile: profiles.oval,
        open: range(r, 1.25, 1.45),
        curve: (u) => 0.2 * u,
        cup: 0.12,
        seed: i * 4 + k,
        shade: (u) => [color[0] * lerp(0.8, 1, u), color[1] * lerp(0.8, 1, u), color[2] * lerp(0.8, 1, u)],
      }, combine(m, place(spin + (k * TAU) / 4 + range(r, -0.15, 0.15), 0.08, 0)))
    }
  }
  return model(R + 0.9, R * 1.75, [['petal', petals], ['fixed', fixed]])
}

function carnation(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const calyx = lin('#7f9c86')
  addLathe(fixed, [[0.01, 0], [0.42, 0.05], [0.48, 0.6], [0.55, 1.6], [0.68, 2.25], [0.62, 2.35]], 14, I,
    (_, a) => {
      const k = 0.88 + 0.12 * Math.abs(Math.sin(a * 2.5))
      return [calyx[0] * k, calyx[1] * k, calyx[2] * k]
    })
  for (let k = 0; k < 5; k++) {
    addPetal(fixed, { length: 0.6, width: 0.35, segU: 3, segV: 2, profile: profiles.lance, open: 0.25, shade: () => calyx }, place((k * TAU) / 5, 0.6, 2.2))
  }
  for (let k = 0; k < 4; k++) {
    addPetal(fixed, { length: 0.6, width: 0.4, segU: 3, segV: 2, profile: profiles.lance, open: 0.5, shade: () => calyx }, place((k * TAU) / 4 + 0.4, 0.4, 0.15))
  }
  const N = 40 + variant * 4
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const inc = lerp(-0.25, 0.35, t)
    addPetal(petals, {
      length: lerp(1.5, 2.4, Math.sqrt(t)),
      width: lerp(1.5, 2.5, t),
      segU: 7,
      segV: 9,
      profile: profiles.fan,
      open: lerp(0.2, 1.35, Math.pow(t, 1.1)) + range(r, -0.08, 0.08),
      curve: (u) => inc * u,
      cup: 0.35,
      ruffle: 0.18,
      ruffleFreq: 5,
      crinkle: 0.12,
      crinkleScale: 1.6,
      fringe: 0.14,
      fringeTeeth: 7,
      seed: i + variant * 60,
      shade: (u) => gray(lerp(0.68, 1, smoothstep(0, 0.6, u))),
    }, place(i * GOLDEN_ANGLE + range(r, -0.2, 0.2), lerp(0.1, 0.65, Math.sqrt(t)), 2.3 + lerp(0.6, 0.15, t)))
  }
  return model(3.0, 4.8, [['petal', petals], ['fixed', fixed]])
}

function hyacinth(variant: number, r: Rng): HeadModel {
  const H = [6.2, 5.6, 6.8][variant]
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  addTube(fixed, [new Vector3(0, 0, 0), new Vector3(0, H * 0.5, 0), new Vector3(0, H + 0.3, 0)], (t) => lerp(0.42, 0.3, t), lin('#8aa86a'), { tubular: 6, radial: 8 })
  const N = 46
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const y = lerp(0.5, H, t) + range(r, -0.1, 0.1)
    const az = i * GOLDEN_ANGLE + range(r, -0.1, 0.1)
    const out = new Vector3(Math.cos(az), 0, Math.sin(az))
    const dir = out.clone().add(new Vector3(0, lerp(-0.45, 0.6, t), 0)).normalize()
    const base = new Vector3(0, y, 0).addScaledVector(out, 0.32)
    const scale = lerp(1.0, 0.75, t) * range(r, 0.92, 1.05)
    const m = basisMatrix(base, dir, new Vector3(0, 1, 0), scale)
    if (t > 0.92) {
      addEllipsoid(petals, new Vector3(0, 0.35, 0).applyMatrix4(m), [0.28 * scale, 0.42 * scale, 0.28 * scale], (_, v) => gray(lerp(0.7, 0.95, v)), { up: dir, segW: 6, segH: 4 })
      continue
    }
    addLathe(petals, [[0.18, 0], [0.22, 0.25], [0.27, 0.55], [0.3, 0.62]], 8, m, (yy) => gray(lerp(0.7, 0.92, yy / 0.62)))
    const spin = range(r, 0, TAU)
    for (let k = 0; k < 6; k++) {
      addPetal(petals, {
        length: 0.75,
        width: 0.36,
        segU: 4,
        segV: 3,
        profile: profiles.oval,
        open: 1.1,
        curve: (u) => 1.1 * u,
        cup: 0.08,
        shade: (u) => gray(lerp(0.88, 1, u)),
      }, combine(m, place(spin + (k * TAU) / 6, 0.27, 0.58)))
    }
  }
  return model(2.4, H + 0.6, [['petal', petals], ['fixed', fixed]])
}

function poppy(variant: number, r: Rng): HeadModel {
  const petals = new GeoBuilder()
  const fixed = new GeoBuilder()
  const cupped = [1, 0.8, 1.2][variant]
  for (let k = 0; k < 4; k++) {
    const outer = k % 2 === 0
    addPetal(petals, {
      length: outer ? 4.0 : 3.6,
      width: outer ? 5.2 : 4.6,
      segU: 12,
      segV: 12,
      profile: profiles.wide,
      open: (outer ? 0.72 : 0.5) / cupped,
      curve: (u) => 0.35 * u * u,
      cup: (outer ? 1.6 : 1.4) * cupped,
      cupProfile: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.2 + u * 0.85)), 0.7),
      crinkle: 0.22,
      crinkleScale: 1.3,
      ruffle: 0.1,
      ruffleFreq: 3,
      seed: k + variant * 13,
      shade: (u) => {
        const blot = 1 - smoothstep(0.1, 0.26, u)
        const v = lerp(1, 0.08, blot)
        return [v, v * 0.95, v * 0.95]
      },
    }, place((k * TAU) / 4 + range(r, -0.1, 0.1), 0.35, 0.35))
  }
  addLathe(fixed, [[0.01, 0.3], [0.45, 0.45], [0.62, 0.9], [0.55, 1.35], [0.3, 1.5], [0.01, 1.52]], 14, I, lin('#9db07d'))
  const stigma = lin('#3a2433')
  addLathe(fixed, [[0.01, 1.58], [0.5, 1.53], [0.64, 1.48]], 16, I, lin('#5a3f55'))
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8
    addEllipsoid(fixed, new Vector3(Math.cos(a) * 0.3, 1.58, Math.sin(a) * 0.3), [0.06, 0.3, 0.05], stigma, { up: new Vector3(Math.cos(a), 0, Math.sin(a)), segW: 4, segH: 3 })
  }
  const stamen = lin('#1f1a1c')
  for (let i = 0; i < 64; i++) {
    const a = i * GOLDEN_ANGLE
    const c = Math.cos(a)
    const s = Math.sin(a)
    const start = new Vector3(c * 0.6, 0.35, s * 0.6)
    const len = range(r, 0.8, 1.05)
    const end = start.clone().add(new Vector3(c * len * 0.6, len * 0.75, s * len * 0.6))
    addTube(fixed, [start, end], 0.025, stamen, { tubular: 1, radial: 3 })
    addEllipsoid(fixed, end, [0.06, 0.07, 0.06], stamen, { segW: 4, segH: 2 })
  }
  return model(4.2, 3.8, [['petal', petals], ['fixed', fixed]])
}

const BUILDERS: Record<FlowerType, (variant: number, r: Rng) => HeadModel> = {
  rose,
  tulip,
  daisy,
  orchid,
  sunflower,
  peony,
  lily,
  lavender,
  hydrangea,
  carnation,
  hyacinth,
  poppy,
}

const cache = new Map<string, HeadModel>()

/** Çiçek başları türe ve varyanta göre bir kez üretilip paylaşılır. */
export function getHeadModel(type: FlowerType, variant: number): HeadModel {
  const v = ((variant % 3) + 3) % 3
  const key = `${type}:${v}`
  let m = cache.get(key)
  if (!m) {
    m = BUILDERS[type](v, rng(9000 + v * 101 + type.length * 7))
    cache.set(key, m)
  }
  return m
}

/** Orkide dudağı gibi ikinci renk: ana rengin koyu ve doygun tonu. */
export function accentColor(hex: string): string {
  const v = parseInt(hex.slice(1), 16)
  const r = (v >> 16) & 255
  const g = (v >> 8) & 255
  const b = v & 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 28) return '#c95d8e'
  const k = 0.62
  const toHex = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')
  const sat = (x: number) => min + (x - min) * 1.25
  return `#${toHex(sat(r) * k)}${toHex(sat(g) * k)}${toHex(sat(b) * k)}`
}
