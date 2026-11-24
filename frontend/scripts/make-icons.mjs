// Uygulama simgelerini (PNG) bağımlılık olmadan üretir: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const BG = hex('#faf6f0')
const PETAL = hex('#efccc6')
const PETAL_LINE = hex('#c4817b')
const CENTER = hex('#9bb08c')
const CENTER_LINE = hex('#6b8160')

/** 40x40 logo uzayında bir noktanın rengi (null = arka plan). */
function sample(x, y) {
  let color = null
  for (let k = 0; k < 5; k++) {
    const a = (-k * 72 * Math.PI) / 180
    const dx = x - 20
    const dy = y - 20
    const rx = dx * Math.cos(a) - dy * Math.sin(a) + 20
    const ry = dx * Math.sin(a) + dy * Math.cos(a) + 20
    const e = Math.sqrt(((rx - 20) / 6.2) ** 2 + ((ry - 11.5) / 9) ** 2)
    if (e <= 1 + 0.55 / 7.5) color = Math.abs(e - 1) * 7.5 < 0.55 ? PETAL_LINE : PETAL
  }
  const d = Math.hypot(x - 20, y - 20)
  if (d <= 4.7) color = d > 3.7 ? CENTER_LINE : CENTER
  return color
}

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, logoFraction) {
  const ss = 4
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const scale = 40 / (size * logoFraction)
  const offset = (size - size * logoFraction) / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const lx = (x + (sx + 0.5) / ss - offset) * scale
          const ly = (y + (sy + 0.5) / ss - offset) * scale
          const c = sample(lx, ly) ?? BG
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = Math.round(r / (ss * ss))
      raw[i + 1] = Math.round(g / (ss * ss))
      raw[i + 2] = Math.round(b / (ss * ss))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/apple-touch-icon.png', png(180, 0.64))
writeFileSync('public/icon-192.png', png(192, 0.6))
writeFileSync('public/icon-512.png', png(512, 0.56))
console.log('simgeler yazıldı')
