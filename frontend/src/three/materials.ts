import {
  CanvasTexture,
  Color,
  DoubleSide,
  type Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { RibbonStyle, WrapMaterial } from '../domain/types'
import { rng } from './math'

export function createPetalMaterial(color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    vertexColors: true,
    side: DoubleSide,
    roughness: 0.62,
    metalness: 0,
  })
}

let fixedMat: MeshStandardMaterial | null = null
let stemMat: MeshStandardMaterial | null = null
let leafMat: MeshStandardMaterial | null = null

/** Kendi rengini köşelerde taşıyan parçalar (göbek, çanak yaprak...). Paylaşılır, atılmaz. */
export function fixedMaterial() {
  fixedMat ??= new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.7 })
  return fixedMat
}

export function stemMaterial() {
  stemMat ??= new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.55 })
  return stemMat
}

export function leafMaterial() {
  leafMat ??= new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.58 })
  return leafMat
}

// ---------------------------------------------------------------------------
// Prosedürel dokular: kâğıt lifi ve kumaş örgüsü. Dosya indirilmez.
// ---------------------------------------------------------------------------

const textureCache = new Map<string, CanvasTexture>()

function makeTexture(kind: 'kraft' | 'paper' | 'fabric'): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const cached = textureCache.get(kind)
  if (cached) return cached
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const r = rng(kind.length * 977)

  if (kind === 'fabric') {
    ctx.fillStyle = '#e6e6e6'
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = `rgba(255,255,255,${0.18 + r() * 0.12})`
      ctx.fillRect(0, y, size, 1)
    }
    for (let x = 0; x < size; x += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`
      ctx.fillRect(x, 0, 1, size)
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.05})`
      ctx.fillRect(r() * size, r() * size, 1 + r() * 3, 1)
    }
  } else {
    ctx.fillStyle = kind === 'kraft' ? '#e2e2e2' : '#f0f0f0'
    ctx.fillRect(0, 0, size, size)
    const fibers = kind === 'kraft' ? 2600 : 1200
    for (let i = 0; i < fibers; i++) {
      const x = r() * size
      const y = r() * size
      const len = 2 + r() * (kind === 'kraft' ? 10 : 6)
      const a = r() * Math.PI
      const light = r() > 0.45
      ctx.strokeStyle = light
        ? `rgba(255,255,255,${0.1 + r() * 0.25})`
        : `rgba(60,40,20,${0.05 + r() * (kind === 'kraft' ? 0.16 : 0.06)})`
      ctx.lineWidth = 0.6 + r() * 0.8
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
    }
    if (kind === 'kraft') {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(70,45,20,${0.15 + r() * 0.2})`
        ctx.fillRect(r() * size, r() * size, 1 + r() * 1.5, 1 + r() * 1.5)
      }
    }
  }
  const tex = new CanvasTexture(canvas)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  textureCache.set(kind, tex)
  return tex
}

export function createWrapMaterial(material: WrapMaterial, color: string): Material {
  if (material === 'clear') {
    return new MeshPhysicalMaterial({
      color: new Color(color),
      vertexColors: true,
      transparent: true,
      opacity: 0.24,
      roughness: 0.1,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: DoubleSide,
      depthWrite: false,
    })
  }
  if (material === 'fabric') {
    const map = makeTexture('fabric')
    return new MeshPhysicalMaterial({
      color: new Color(color),
      vertexColors: true,
      map,
      bumpMap: map,
      bumpScale: 0.6,
      roughness: 0.92,
      sheen: 1,
      sheenRoughness: 0.55,
      sheenColor: new Color(color).lerp(new Color('#ffffff'), 0.5),
      side: DoubleSide,
    })
  }
  const map = makeTexture(material === 'kraft' ? 'kraft' : 'paper')
  return new MeshStandardMaterial({
    color: new Color(color),
    vertexColors: true,
    map,
    bumpMap: map,
    bumpScale: material === 'kraft' ? 1.2 : 0.5,
    roughness: material === 'kraft' ? 0.92 : 0.82,
    side: DoubleSide,
  })
}

/** İç katman: aynı malzemenin açık tonu (kraftın içinde krem kâğıt gibi). */
export function innerWrapColor(material: WrapMaterial, color: string): string {
  if (material === 'kraft') return '#f1e7d6'
  return '#' + new Color(color).lerp(new Color('#ffffff'), 0.55).getHexString()
}

export function createRibbonMaterial(style: RibbonStyle, color: string): Material {
  if (style === 'satin') {
    return new MeshPhysicalMaterial({
      color: new Color(color),
      vertexColors: true,
      roughness: 0.32,
      sheen: 0.7,
      sheenRoughness: 0.3,
      sheenColor: new Color('#ffffff'),
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
      side: DoubleSide,
    })
  }
  return new MeshStandardMaterial({
    color: new Color(color),
    vertexColors: true,
    roughness: style === 'twine' ? 1 : 0.85,
    side: DoubleSide,
  })
}
