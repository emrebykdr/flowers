import { Quaternion, Vector3 } from 'three'
import { FLOWER_MAP, type FlowerRole } from '../domain/catalog'
import type { BouquetDesign, BouquetShape, FlowerGroup, FlowerType } from '../domain/types'
import { basisMatrix } from './geometry'
import { clamp, DEG, GOLDEN_ANGLE, hashString, hexToLinear, range, rng, type RGB } from './math'

export interface StemLayout {
  key: string
  groupId: string
  type: FlowerType
  variant: number
  /** Başın oturduğu nokta (sapın ucu). */
  head: Vector3
  /** Başın baktığı yön. */
  dir: Vector3
  quaternion: Quaternion
  scale: number
  /** Alttan başa sap kontrol noktaları. */
  stem: Vector3[]
  stemRadius: number
  stemColor: RGB
}

export interface SprigLayout {
  kind: 'eucalyptus' | 'ruscus'
  variant: number
  base: Vector3
  dir: Vector3
  outward: Vector3
  length: number
  stem: Vector3[]
}

export interface BouquetLayout {
  stems: StemLayout[]
  sprigs: SprigLayout[]
  /** Çiçek başlarının yayıldığı yarıçap. */
  radius: number
  /** Ambalajın üst kenarı (yaklaşık). */
  rimY: number
  rimRadius: number
  /** Bağlama noktasındaki sap demeti yarıçapı. */
  bundleRadius: number
  topY: number
  bottomY: number
  center: Vector3
  /** Kamera sığdırma için yaklaşık sınır yarıçapı. */
  extent: number
}

interface ShapeParams {
  density: number
  dome: number
  height: number
  jitterH: number
  jitterR: number
  lean: number
  scale: number
  spread: number
}

const SHAPES: Record<BouquetShape, ShapeParams> = {
  classic: { density: 0.78, dome: 0.95, height: 1.0, jitterH: 1.4, jitterR: 0.05, lean: 1.0, scale: 1.0, spread: 1.0 },
  round: { density: 0.95, dome: 0.75, height: 0.96, jitterH: 0.4, jitterR: 0.02, lean: 1.2, scale: 1.0, spread: 0.92 },
  handtied: { density: 0.62, dome: 0.7, height: 1.04, jitterH: 2.6, jitterR: 0.1, lean: 1.1, scale: 1.0, spread: 1.08 },
  cascade: { density: 0.8, dome: 0.85, height: 1.0, jitterH: 1.2, jitterR: 0.05, lean: 1.0, scale: 1.0, spread: 0.92 },
  wild: { density: 0.5, dome: 0.55, height: 1.08, jitterH: 5.5, jitterR: 0.2, lean: 1.3, scale: 0.98, spread: 1.15 },
  minimal: { density: 0.36, dome: 0.45, height: 1.15, jitterH: 6.5, jitterR: 0.12, lean: 0.55, scale: 1.0, spread: 0.85 },
  grand: { density: 0.86, dome: 0.9, height: 1.0, jitterH: 1.0, jitterR: 0.04, lean: 1.05, scale: 1.12, spread: 1.08 },
}

const ROLE_PREF: Record<FlowerRole, number> = { focal: 0.3, middle: 0.5, spike: 0.78, spray: 0.86 }

interface Item {
  group: FlowerGroup
  index: number
  type: FlowerType
  role: FlowerRole
  r: number
  scale: number
  variant: number
  manual: boolean
  tail: boolean
  pos: Vector3
  jitterY: number
  theta: number
  key: number
}

const UP = new Vector3(0, 1, 0)

export function computeLayout(design: BouquetDesign): BouquetLayout {
  const P = SHAPES[design.shape] ?? SHAPES.classic
  const rand = rng(design.seed * 7919 + 13)
  const wrap = design.packaging
  const coneWrap = wrap.wrapMaterial !== 'none' && wrap.wrapShape === 'cone'

  // 1. Grupları tek tek dallara aç
  const items: Item[] = []
  for (const group of design.flowers) {
    const info = FLOWER_MAP[group.type]
    const gh = hashString(group.id)
    for (let k = 0; k < group.count; k++) {
      const scale = group.size * P.scale * range(rand, 0.94, 1.06)
      items.push({
        group,
        index: k,
        type: group.type,
        role: info.role,
        r: info.headRadius * scale,
        scale,
        variant: (gh + k) % 3,
        manual: group.placement.mode === 'manual',
        tail: false,
        pos: new Vector3(),
        jitterY: 0,
        theta: 0,
        key: 0,
      })
    }
  }

  // 2. Şelale: uzun ve sarkan türler öne akar
  if (design.shape === 'cascade' && items.length >= 4) {
    const candidates = items
      .filter((i) => !i.manual)
      .map((i) => ({ i, score: (i.role === 'spray' ? 3 : i.role === 'spike' ? 2 : i.role === 'middle' ? 1 : 0) + i.group.stemLength / 100 + rand() * 0.5 }))
      .sort((a, b) => b.score - a.score)
    const nTail = Math.max(1, Math.round(items.length * 0.3))
    candidates.slice(0, nTail).forEach((c) => (c.i.tail = true))
  }

  const core = items.filter((i) => !i.tail)
  const area = core.reduce((a, it) => a + Math.PI * (it.r * 0.92) ** 2, 0)
  const R = Math.max(4.5, Math.sqrt(area / (Math.PI * P.density)) * P.spread)
  const Hc = (21 + R * 0.32) * P.height
  const drop = R * 0.42 * P.dome
  const domeY = (rr: number) => Hc - (drop * rr * rr) / (R * R)
  const thetaOffset = rand() * Math.PI * 2

  // 3. Otomatik dallar: Fermat sarmalı, odak çiçekler merkeze yakın
  const autos = core.filter((i) => !i.manual)
  autos.forEach((it) => (it.key = ROLE_PREF[it.role] + range(rand, -0.18, 0.18)))
  autos.sort((a, b) => a.key - b.key)
  autos.forEach((it, i) => {
    const rn = clamp(Math.sqrt((i + 0.5) / autos.length) * (1 + range(rand, -P.jitterR, P.jitterR)), 0, 1.08)
    it.theta = i * GOLDEN_ANGLE + thetaOffset
    const rr = rn * R
    const roleLift = it.role === 'spike' ? 2.5 : it.role === 'spray' ? 1 : 0
    it.jitterY = range(rand, -1, 1) * P.jitterH + roleLift
    it.pos.set(Math.sin(it.theta) * rr, domeY(rr) + it.jitterY, Math.cos(it.theta) * rr)
  })

  // 4. Elle yerleştirilen gruplar: seçilen noktanın çevresinde küçük küme
  for (const it of core.filter((i) => i.manual)) {
    const p = it.group.placement
    const a = p.angle * DEG
    const d = clamp(p.radius, 0, 1) * R
    const off = it.index === 0 ? 0 : it.r * 1.1 * Math.sqrt(it.index)
    const oa = it.index * GOLDEN_ANGLE
    it.theta = a
    it.jitterY = p.height
    it.pos.set(Math.sin(a) * d + Math.sin(oa) * off, domeY(d) + p.height, Math.cos(a) * d + Math.cos(oa) * off)
  }

  // 5. Çakışmaları gevşet: başlar birbirinin içine girmesin
  const moving = core
  for (let iter = 0; iter < 28; iter++) {
    for (let a = 0; a < moving.length; a++) {
      for (let b = a + 1; b < moving.length; b++) {
        const A = moving[a]
        const B = moving[b]
        const dx = B.pos.x - A.pos.x
        const dz = B.pos.z - A.pos.z
        const dy = (B.pos.y - A.pos.y) * 0.6
        const dist = Math.sqrt(dx * dx + dz * dz + dy * dy)
        const min = (A.r + B.r) * 0.8
        if (dist >= min) continue
        const h = Math.sqrt(dx * dx + dz * dz) || 1e-3
        const ux = dist < 1e-3 ? Math.cos(a + b) : dx / h
        const uz = dist < 1e-3 ? Math.sin(a + b) : dz / h
        const push = (min - dist) * 0.5
        const wa = A.manual ? 0 : B.manual ? 1 : 0.5
        const wb = B.manual ? 0 : A.manual ? 1 : 0.5
        A.pos.x -= ux * push * wa * 2
        A.pos.z -= uz * push * wa * 2
        B.pos.x += ux * push * wb * 2
        B.pos.z += uz * push * wb * 2
      }
    }
    for (const it of moving) {
      if (it.manual) continue
      const h = Math.hypot(it.pos.x, it.pos.z)
      const max = R * 1.18
      if (h > max) {
        it.pos.x *= max / h
        it.pos.z *= max / h
      }
      it.pos.y = domeY(Math.min(h, R)) + it.jitterY
    }
  }

  const rimY = Math.max(9, domeY(R) - 7 - (design.shape === 'minimal' ? 4 : 0))
  const rimRadius = R * 0.86 + 1.4
  for (const it of core) {
    if (!it.manual) it.pos.y = Math.max(it.pos.y, rimY + 1.5)
  }

  // 6. Şelale kuyruğu: ön kenardan aşağı sarkan dallar
  const tails = items.filter((i) => i.tail)
  tails.forEach((it, k) => {
    const f = (k + 1) / tails.length
    const side = k % 2 === 0 ? 1 : -1
    it.pos.set(side * R * 0.32 * (1 - f * 0.6) + range(rand, -1, 1), rimY + 1 - f * (rimY + 9), R * 0.82 + 2 + f * 2.5)
  })

  // 7. Yön, sap eğrisi
  const totalStemArea = items.reduce((a, it) => a + FLOWER_MAP[it.type].stemRadius ** 2, 0)
  const bundleRadius = Math.sqrt(totalStemArea) * 1.7 + 0.45
  const bottomY = coneWrap ? -13 : -20
  const splay = coneWrap ? 0.85 : 0.5

  const stems: StemLayout[] = items.map((it, i) => {
    const info = FLOWER_MAP[it.type]
    const g = it.group
    const head = it.pos.clone()
    const horiz = new Vector3(head.x, 0, head.z)
    const outward = horiz.lengthSq() > 1e-4 ? horiz.clone().normalize() : new Vector3(Math.sin(it.theta), 0, Math.cos(it.theta))

    let dir: Vector3
    if (it.tail) {
      const f = tails.indexOf(it) / Math.max(1, tails.length)
      dir = new Vector3(head.x * 0.03, 0.25 - f * 0.9, 1).normalize()
    } else {
      const k = P.lean * 0.075 * (it.role === 'spike' ? 0.55 : 1)
      dir = new Vector3(head.x * k, 1, head.z * k).normalize()
      const wobble = range(rand, -6, 6) * DEG
      dir.applyAxisAngle(new Vector3().crossVectors(UP, outward).normalize(), wobble)
    }

    // Kullanıcının eğim ve yön ayarı
    if (g.tilt) {
      const axis = new Vector3().crossVectors(dir, outward)
      if (axis.lengthSq() < 1e-6) axis.crossVectors(UP, outward)
      axis.normalize()
      dir.applyAxisAngle(axis, g.tilt * DEG)
    }
    if (g.turn) dir.applyAxisAngle(UP, g.turn * DEG)
    dir.normalize()

    // Sap uzunluğu: başı bağlama noktasından uzaklaştırır/yaklaştırır
    const delta = (g.stemLength - info.defaultStemLength) * 0.5
    if (delta !== 0 && !it.tail) {
      const away = head.clone().normalize()
      head.addScaledVector(away, delta)
    }

    const directional = it.type === 'orchid' || it.type === 'lily'
    const m = basisMatrix(head, dir, directional ? outward : new Vector3(Math.sin(i * 2.4), 0, Math.cos(i * 2.4)))
    const quaternion = new Quaternion().setFromRotationMatrix(m)

    // Sap: alt uç → bağlama → orta → baş altı → baş
    const ta = i * GOLDEN_ANGLE + Math.PI
    const tr = bundleRadius * 0.55 * Math.sqrt((i + 0.5) / items.length)
    const tie = new Vector3(Math.cos(ta) * tr, 0, Math.sin(ta) * tr)
    const under = head.clone().addScaledVector(dir, -3 * it.scale)
    const points: Vector3[] = []

    let mid: Vector3
    if (it.tail) {
      mid = new Vector3(head.x * 0.3, rimY * 0.55, rimRadius * 0.45)
      const lip = new Vector3(head.x * 0.6, rimY + 1.5, rimRadius * 0.9)
      const down = tie.clone().sub(mid).normalize()
      const bdir = down.lerp(new Vector3(0, -1, 0), splay).normalize()
      const bottom = tie.clone().addScaledVector(bdir, (tie.y - bottomY) / -bdir.y)
      points.push(bottom, tie, mid, lip, under, head)
    } else {
      mid = tie.clone().lerp(under, 0.5)
      mid.addScaledVector(new Vector3(under.x, 0, under.z), 0.05)
      const down = tie.clone().sub(mid).normalize()
      const bdir = down.lerp(new Vector3(0, -1, 0), splay).normalize()
      const bottom = tie.clone().addScaledVector(bdir, (tie.y - bottomY - range(rand, -0.4, 0.4)) / -bdir.y)
      points.push(bottom, tie.clone().lerp(bottom, 0.35), tie, mid, under, head)
    }

    return {
      key: `${g.id}:${it.index}`,
      groupId: g.id,
      type: it.type,
      variant: it.variant,
      head,
      dir,
      quaternion,
      scale: it.scale,
      stem: points,
      stemRadius: info.stemRadius * Math.min(1.25, Math.max(0.85, it.scale)),
      stemColor: hexToLinear(info.stemColor),
    }
  })

  // 8. Yeşillik: kenarlarda dışa taşan okaliptüs ve ruscus dalları
  const sprigs: SprigLayout[] = []
  const nEuc = design.greenery === 'none' ? 0 : design.greenery === 'light' ? (design.shape === 'minimal' ? 3 : 6) : 11
  const nRus = design.greenery === 'lush' ? 5 : 0
  const total = nEuc + nRus
  for (let s = 0; s < total; s++) {
    const kind = s < nEuc ? 'eucalyptus' : 'ruscus'
    const a = (s / total) * Math.PI * 2 + thetaOffset * 0.5 + range(rand, -0.25, 0.25)
    const outward = new Vector3(Math.sin(a), 0, Math.cos(a))
    const rr = R * range(rand, 0.78, 0.98)
    const base = new Vector3(outward.x * rr, domeY(rr) - range(rand, 2, 4.5), outward.z * rr)
    base.y = Math.max(base.y, rimY - 1)
    const lean = range(rand, 0.95, 1.5)
    const dir = new Vector3(outward.x * lean, 1, outward.z * lean).normalize()
    const ta = s * 2.1
    const tie = new Vector3(Math.cos(ta) * bundleRadius * 0.4, 0, Math.sin(ta) * bundleRadius * 0.4)
    const under = base.clone().addScaledVector(dir, -2)
    const mid = tie.clone().lerp(under, 0.5)
    const down = tie.clone().sub(mid).normalize().lerp(new Vector3(0, -1, 0), splay).normalize()
    const bottom = tie.clone().addScaledVector(down, (tie.y - bottomY + 1) / -down.y)
    sprigs.push({
      kind,
      variant: s % 3,
      base,
      dir,
      outward,
      length: kind === 'eucalyptus' ? range(rand, 9, 13) : range(rand, 11, 15),
      stem: [bottom, tie, mid, under, base],
    })
  }

  let topY = rimY
  let extentR = R
  for (const s of stems) {
    topY = Math.max(topY, s.head.y + 4 * s.scale)
    extentR = Math.max(extentR, Math.hypot(s.head.x, s.head.z) + 4)
  }
  const minY = Math.min(bottomY, ...stems.map((s) => s.head.y - 6))
  const center = new Vector3(0, (topY + minY) / 2, 0)
  const extent = Math.max(extentR + 2, (topY - minY) / 2 + 2)

  return {
    stems,
    sprigs,
    radius: R,
    rimY,
    rimRadius,
    bundleRadius,
    topY,
    bottomY,
    center,
    extent,
  }
}

/** Yerleşimi etkileyen alanlar; renk değişince yerleşim yeniden hesaplanmaz. */
export function layoutKey(design: BouquetDesign): string {
  return JSON.stringify([
    design.shape,
    design.greenery,
    design.seed,
    design.packaging.wrapMaterial === 'none' ? 'none' : design.packaging.wrapShape,
    design.flowers.map((f) => [f.id, f.type, f.count, f.stemLength, f.size, f.tilt, f.turn, f.placement]),
  ])
}

