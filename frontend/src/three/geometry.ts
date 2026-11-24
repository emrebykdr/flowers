import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { clamp, fbm2, lerp, smoothstep, TAU, type RGB } from './math'

const WHITE: RGB = [1, 1, 1]
const tmp = new Vector3()

export interface VertexOut {
  p: Vector3
  c: RGB
  uv?: [number, number]
}

/**
 * Parça parça geometri biriktirir ve tek bir BufferGeometry'ye çevirir.
 * Bir çiçek başının bütün taç yaprakları tek çizim çağrısı olur.
 */
export class GeoBuilder {
  private pos: number[] = []
  private col: number[] = []
  private uvs: number[] = []
  private idx: number[] = []
  private withUv: boolean

  constructor(withUv = false) {
    this.withUv = withUv
  }

  get vertexCount() {
    return this.pos.length / 3
  }

  get isEmpty() {
    return this.idx.length === 0
  }

  /** rows × cols köşeli ızgara; fn her köşe için konum ve renk yazar. */
  grid(rows: number, cols: number, fn: (i: number, j: number, out: VertexOut) => void, matrix?: Matrix4, flip = false) {
    const base = this.vertexCount
    const out: VertexOut = { p: new Vector3(), c: WHITE }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        out.c = WHITE
        out.uv = undefined
        fn(i, j, out)
        if (matrix) out.p.applyMatrix4(matrix)
        this.pos.push(out.p.x, out.p.y, out.p.z)
        this.col.push(out.c[0], out.c[1], out.c[2])
        if (this.withUv) this.uvs.push(out.uv?.[0] ?? j / (cols - 1), out.uv?.[1] ?? i / (rows - 1))
      }
    }
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = base + i * cols + j
        const b = a + cols
        if (flip) this.idx.push(a, a + 1, b, b, a + 1, b + 1)
        else this.idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3))
    if (this.withUv) g.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2))
    g.setIndex(this.idx)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }
}

// ---------------------------------------------------------------------------
// Taç yaprağı / yaprak
// ---------------------------------------------------------------------------

export type Profile = (u: number) => number

const sinPow = (u: number, exp: number, pow: number) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, exp))), pow)

/** Genişlik profilleri: u = 0 taban, u = 1 uç. */
export const profiles = {
  /** Gül: dar tabanlı, üstte geniş ve yuvarlak. */
  round: (u: number) => sinPow(u, 1.55, 0.5),
  /** Lale, şakayık iç yaprakları. */
  oval: (u: number) => sinPow(u, 1.12, 0.6),
  ellipse: (u: number) => sinPow(u, 1, 0.6),
  /** Sivri uçlu (lilyum, ayçiçeği). */
  lance: (u: number) => sinPow(u, 0.62, 0.85),
  /** Papatya: şerit gibi, ucu yuvarlak. */
  strap: (u: number) => Math.pow(Math.min(1, u * 7), 0.5) * Math.pow(Math.max(0, 1 - Math.pow(u, 7)), 0.4),
  /** Karanfil: yelpaze, üst kenar geniş. */
  fan: (u: number) => Math.pow(u, 0.55) * Math.pow(Math.max(0, 1 - Math.pow(u, 9)), 0.3),
  /** Gelincik, şakayık dış yaprakları: çok geniş ve yuvarlak. */
  wide: (u: number) => sinPow(u, 1.3, 0.42),
  /** Yaprak: tabanı yumuşak, ucu sivri. */
  leaf: (u: number) => sinPow(u, 0.85, 0.85),
  /** Okaliptüs yaprağı gibi yuvarlak. */
  disc: (u: number) => sinPow(u, 1, 0.5),
}

export interface PetalSpec {
  length: number
  width: number
  segU?: number
  segV?: number
  profile?: Profile
  /** Dikeyden dışa açılma açısı (radyan). 0 = dik, π/2 = yatay. */
  open?: number
  /** u boyunca eklenen toplam açı (radyan); + dışa/geriye kıvrılma. */
  curve?: (u: number) => number
  /** Kenarların merkeze doğru kıvrılması (cm). */
  cup?: number
  cupProfile?: (u: number) => number
  /** Uca yakın kenarların dışa kıvrılması (cm, gül). */
  roll?: number
  /** Kenar dalgası (cm). */
  ruffle?: number
  ruffleFreq?: number
  /** Kâğıt gibi buruşukluk (cm). */
  crinkle?: number
  crinkleScale?: number
  /** Üst kenarda diş (karanfil). */
  fringe?: number
  fringeTeeth?: number
  /** Yaprak kenarında testere dişi. */
  serration?: number
  serrationTeeth?: number
  /** Orta damar boyunca V katlanma (cm). */
  fold?: number
  twist?: number
  seed?: number
  shade?: (u: number, s: number) => RGB
}

/**
 * Yerel uzayda taç yaprağı: taban orijinde, +Y boyunca uzar, dış yüz +Z.
 * Orta çizgi eğrilik integraliyle kurulur, böylece lilyumdaki gibi güçlü geri kıvrımlar da doğru çıkar.
 */
export function addPetal(b: GeoBuilder, spec: PetalSpec, matrix: Matrix4) {
  const segU = spec.segU ?? 10
  const segV = spec.segV ?? 6
  const profile = spec.profile ?? profiles.round
  const open = spec.open ?? 0
  const curve = spec.curve
  const seed = spec.seed ?? 0
  const phase = (seed * 1.618) % TAU

  const N = 40
  const ys = new Float32Array(N + 1)
  const zs = new Float32Array(N + 1)
  const ths = new Float32Array(N + 1)
  let y = 0
  let z = 0
  const ds = spec.length / N
  for (let k = 0; k <= N; k++) {
    const u = k / N
    ys[k] = y
    zs[k] = z
    ths[k] = open + (curve ? curve(u) : 0)
    if (k < N) {
      const thm = open + (curve ? curve((k + 0.5) / N) : 0)
      y += Math.cos(thm) * ds
      z += Math.sin(thm) * ds
    }
  }

  const crScale = spec.crinkleScale ?? 1
  b.grid(segU + 1, segV + 1, (i, j, out) => {
    const u0 = i / segU
    const s = (j / segV) * 2 - 1
    let u = u0
    if (spec.fringe) {
      const teeth = spec.fringeTeeth ?? 6
      const tri = Math.abs((((s * 0.5 + 0.5) * teeth) % 1) - 0.5) * 2
      u = u0 * (1 - spec.fringe * tri * Math.pow(u0, 4))
    }
    const f = clamp(u, 0, 1) * N
    const k = Math.min(N - 1, Math.floor(f))
    const t = f - k
    const my = lerp(ys[k], ys[k + 1], t)
    const mz = lerp(zs[k], zs[k + 1], t)
    const th = lerp(ths[k], ths[k + 1], t)

    let hw = spec.width * 0.5 * profile(u)
    if (spec.serration) {
      const teeth = spec.serrationTeeth ?? 8
      hw *= 1 - spec.serration * Math.abs(((u * teeth) % 1) - 0.5) * 2 * smoothstep(0.08, 0.3, u)
    }
    const x = s * hw

    let off = 0
    if (spec.cup) off -= spec.cup * (spec.cupProfile ? spec.cupProfile(u) : 1) * s * s
    if (spec.fold) off -= spec.fold * Math.abs(s) * Math.sin(Math.PI * Math.min(1, u * 1.1))
    if (spec.roll) off += spec.roll * Math.pow(Math.abs(s), 3) * smoothstep(0.35, 1, u)
    if (spec.ruffle) {
      off += spec.ruffle * Math.sin(s * (spec.ruffleFreq ?? 3) * Math.PI + phase) * Math.pow(Math.abs(s), 1.5) * smoothstep(0.15, 1, u)
    }
    if (spec.crinkle) {
      off += spec.crinkle * fbm2(u * spec.length * crScale, x * crScale + seed * 3.1, seed) * smoothstep(0, 0.35, u)
    }

    const tw = (spec.twist ?? 0) * u
    const ct = Math.cos(tw)
    const st = Math.sin(tw)
    const xr = x * ct - off * st
    const orr = x * st + off * ct
    out.p.set(xr, my - orr * Math.sin(th), mz + orr * Math.cos(th))
    out.c = spec.shade ? spec.shade(u, s) : WHITE
  }, matrix)
}

// ---------------------------------------------------------------------------
// Dönel yüzey, tüp, elipsoit
// ---------------------------------------------------------------------------

/** points: [yarıçap, y] çiftleri (aşağıdan yukarı). */
export function addLathe(
  b: GeoBuilder,
  points: [number, number][],
  segments: number,
  matrix: Matrix4 | undefined,
  color: RGB | ((y: number, angle: number, r: number) => RGB),
) {
  b.grid(points.length, segments + 1, (i, j, out) => {
    const [r, y] = points[i]
    const a = (j / segments) * TAU
    out.p.set(Math.cos(a) * r, y, Math.sin(a) * r)
    out.c = typeof color === 'function' ? color(y, a, r) : color
  }, matrix, true)
}

export function addEllipsoid(
  b: GeoBuilder,
  center: Vector3,
  radii: [number, number, number],
  color: RGB | ((u: number, v: number) => RGB),
  opts: { up?: Vector3; segW?: number; segH?: number; matrix?: Matrix4 } = {},
) {
  const segW = opts.segW ?? 8
  const segH = opts.segH ?? 6
  const q = new Quaternion()
  if (opts.up) q.setFromUnitVectors(new Vector3(0, 1, 0), tmp.copy(opts.up).normalize())
  const m = new Matrix4().compose(center, q, new Vector3(1, 1, 1))
  if (opts.matrix) m.premultiply(opts.matrix)
  b.grid(segH + 1, segW + 1, (i, j, out) => {
    const v = i / segH
    const u = j / segW
    const phi = v * Math.PI
    const th = u * TAU
    out.p.set(-Math.cos(th) * Math.sin(phi) * radii[0], -Math.cos(phi) * radii[1], Math.sin(th) * Math.sin(phi) * radii[2])
    out.c = typeof color === 'function' ? color(u, v) : color
  }, m, true)
}

export function addTube(
  b: GeoBuilder,
  points: Vector3[],
  radius: number | ((t: number) => number),
  color: RGB | ((t: number) => RGB),
  opts: { tubular?: number; radial?: number; matrix?: Matrix4; closedCaps?: boolean } = {},
) {
  if (points.length < 2) return
  const tubular = opts.tubular ?? Math.max(4, points.length * 4)
  const radial = opts.radial ?? 6
  const curve = new CatmullRomCurve3(points, false, 'centripetal')
  const frames = curve.computeFrenetFrames(tubular, false)
  const p = new Vector3()
  b.grid(tubular + 1, radial + 1, (i, j, out) => {
    const t = i / tubular
    curve.getPointAt(t, p)
    const r = typeof radius === 'function' ? radius(t) : radius
    const a = (j / radial) * TAU
    const n = frames.normals[i]
    const bn = frames.binormals[i]
    out.p.set(
      p.x + r * (Math.cos(a) * n.x + Math.sin(a) * bn.x),
      p.y + r * (Math.cos(a) * n.y + Math.sin(a) * bn.y),
      p.z + r * (Math.cos(a) * n.z + Math.sin(a) * bn.z),
    )
    out.c = typeof color === 'function' ? color(t) : color
  }, opts.matrix)
  if (opts.closedCaps) {
    const end = curve.getPointAt(0)
    const r0 = typeof radius === 'function' ? radius(0) : radius
    const tangent = curve.getTangentAt(0).negate()
    addDisc(b, end, tangent, r0, typeof color === 'function' ? color(0) : color, opts.matrix)
  }
}

export function addDisc(b: GeoBuilder, center: Vector3, normal: Vector3, radius: number, color: RGB, matrix?: Matrix4) {
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal.clone().normalize())
  const m = new Matrix4().compose(center, q, new Vector3(1, 1, 1))
  if (matrix) m.premultiply(matrix)
  b.grid(2, 9, (i, j, out) => {
    const a = (j / 8) * TAU
    const r = i === 0 ? 0 : radius
    out.p.set(Math.cos(a) * r, 0, Math.sin(a) * r)
    out.c = color
  }, m, true)
}

/**
 * Yassı şerit (kurdele). widthAxis her noktada şeridin genişlik yönünü verir.
 */
export function addRibbonStrip(
  b: GeoBuilder,
  points: Vector3[],
  width: number | ((t: number) => number),
  widthAxis: (t: number, tangent: Vector3, point: Vector3) => Vector3,
  color: RGB | ((t: number, s: number) => RGB),
  opts: { segments?: number; closed?: boolean; endCut?: number } = {},
) {
  const segments = opts.segments ?? 48
  const curve = new CatmullRomCurve3(points, opts.closed ?? false, 'centripetal')
  const p = new Vector3()
  const tan = new Vector3()
  const w = new Vector3()
  b.grid(segments + 1, 3, (i, j, out) => {
    const t = i / segments
    curve.getPointAt(t, p)
    curve.getTangentAt(t, tan)
    const axis = widthAxis(t, tan, p)
    w.copy(axis).addScaledVector(tan, -axis.dot(tan)).normalize()
    const s = j - 1 // -1, 0, 1
    const wd = typeof width === 'function' ? width(t) : width
    let along = 0
    // Kuyruk ucunda V kesik
    if (opts.endCut && i === segments) along = s === 0 ? -opts.endCut : 0
    out.p.copy(p).addScaledVector(w, s * wd * 0.5).addScaledVector(tan, along)
    out.c = typeof color === 'function' ? color(t, s) : color
  })
}

/** Y ekseni dir'e, Z ekseni hint'in dik izdüşümüne bakan dönüşüm. */
export function basisMatrix(position: Vector3, dir: Vector3, hint: Vector3, scale = 1): Matrix4 {
  const y = dir.clone().normalize()
  let z = hint.clone().addScaledVector(y, -hint.dot(y))
  if (z.lengthSq() < 1e-6) {
    z = Math.abs(y.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
    z.addScaledVector(y, -z.dot(y))
  }
  z.normalize()
  const x = new Vector3().crossVectors(y, z).normalize()
  const m = new Matrix4().makeBasis(x, y, z)
  m.scale(new Vector3(scale, scale, scale))
  m.setPosition(position)
  return m
}

/** Çiçek ekseni etrafında azimut + dışa doğru ötelenmiş yerleşim. */
export function place(azimuth: number, radius: number, height: number, roll = 0): Matrix4 {
  const m = new Matrix4().makeRotationY(azimuth)
  m.multiply(new Matrix4().makeTranslation(0, height, radius))
  if (roll) m.multiply(new Matrix4().makeRotationZ(roll))
  return m
}

export function combine(...ms: Matrix4[]): Matrix4 {
  const out = new Matrix4()
  for (const m of ms) out.multiply(m)
  return out
}
