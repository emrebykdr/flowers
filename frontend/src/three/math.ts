export const TAU = Math.PI * 2
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
export const DEG = Math.PI / 180

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Tekrarlanabilir rastgele sayı üreteci. Aynı tohum, aynı buket. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof rng>

export const range = (r: Rng, a: number, b: number) => a + (b - a) * r()

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

/** Yumuşak 2B değer gürültüsü, -1..1. */
export function noise2(x: number, y: number, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1
}

export function fbm2(x: number, y: number, seed = 0, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq, seed + i * 17) * amp
    freq *= 2
    amp *= 0.5
  }
  return sum
}

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

/** sRGB hex rengini doğrusal uzaya çevirir (köşe renkleri doğrusal uzayda saklanır). */
export function hexToLinear(hex: string): RGB {
  const [r, g, b] = hexToRgb(hex)
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return [f(r), f(g), f(b)]
}

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
export const scaleRgb = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k]
