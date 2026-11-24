import type {
  BouquetDesign,
  BouquetShape,
  FlowerGroup,
  FlowerType,
  Greenery,
  Packaging,
  RibbonStyle,
  WrapMaterial,
  WrapShape,
} from './types'

export interface Swatch {
  name: string
  hex: string
}

/** Yerleşimde nereye konacağını belirler. */
export type FlowerRole = 'focal' | 'middle' | 'spike' | 'spray'

export interface FlowerInfo {
  type: FlowerType
  name: string
  plural: string
  blurb: string
  role: FlowerRole
  /** Çiçek başının yaklaşık yarıçapı, cm (yerleşim çakışma hesabı için). */
  headRadius: number
  defaultColor: string
  palette: Swatch[]
  defaultStemLength: number
  /** Sap kalınlığı, cm (yarıçap). */
  stemRadius: number
  stemColor: string
}

export const FLOWERS: FlowerInfo[] = [
  {
    type: 'rose',
    name: 'Gül',
    plural: 'gül',
    blurb: 'Katman katman açılan taç yapraklar.',
    role: 'focal',
    headRadius: 3.6,
    defaultColor: '#e8a5ad',
    palette: [
      { name: 'Pudra', hex: '#e8a5ad' },
      { name: 'Kırmızı', hex: '#b3122e' },
      { name: 'Bordo', hex: '#6e1423' },
      { name: 'Şampanya', hex: '#f1dcc4' },
      { name: 'Beyaz', hex: '#f7f3ee' },
      { name: 'Mercan', hex: '#f08070' },
      { name: 'Sarı', hex: '#f4cf63' },
      { name: 'Lila', hex: '#b9a3d0' },
    ],
    defaultStemLength: 40,
    stemRadius: 0.24,
    stemColor: '#3f5a2c',
  },
  {
    type: 'tulip',
    name: 'Lale',
    plural: 'lale',
    blurb: 'Kapalı, zarif bir kadeh.',
    role: 'middle',
    headRadius: 2.7,
    defaultColor: '#f4b6c2',
    palette: [
      { name: 'Pembe', hex: '#f4b6c2' },
      { name: 'Kırmızı', hex: '#d62839' },
      { name: 'Sarı', hex: '#f6d55c' },
      { name: 'Beyaz', hex: '#f8f4ec' },
      { name: 'Mor', hex: '#6c3a8c' },
      { name: 'Turuncu', hex: '#f28c38' },
      { name: 'Leylak', hex: '#c7b3e5' },
      { name: 'Krem', hex: '#f3e3c3' },
    ],
    defaultStemLength: 38,
    stemRadius: 0.34,
    stemColor: '#6f8f4e',
  },
  {
    type: 'daisy',
    name: 'Papatya',
    plural: 'papatya',
    blurb: 'Sade, ince yapraklı, sarı göbekli.',
    role: 'middle',
    headRadius: 3.2,
    defaultColor: '#ffffff',
    palette: [
      { name: 'Beyaz', hex: '#ffffff' },
      { name: 'Krem', hex: '#f6efdc' },
      { name: 'Pembe', hex: '#f5c6d0' },
      { name: 'Sarı', hex: '#f7dc6f' },
      { name: 'Lila', hex: '#d8c8f0' },
    ],
    defaultStemLength: 32,
    stemRadius: 0.14,
    stemColor: '#58763c',
  },
  {
    type: 'orchid',
    name: 'Orkide',
    plural: 'orkide',
    blurb: 'Kavisli dalda sıralanan çiçekler.',
    role: 'spray',
    headRadius: 5,
    defaultColor: '#faf7f5',
    palette: [
      { name: 'Beyaz', hex: '#faf7f5' },
      { name: 'Fuşya', hex: '#c8418a' },
      { name: 'Pembe', hex: '#efb3cc' },
      { name: 'Mor', hex: '#7e4a9e' },
      { name: 'Sarı', hex: '#f2dc8c' },
      { name: 'Lila', hex: '#c4a6dd' },
    ],
    defaultStemLength: 44,
    stemRadius: 0.2,
    stemColor: '#5d6b3a',
  },
  {
    type: 'sunflower',
    name: 'Ayçiçeği',
    plural: 'ayçiçeği',
    blurb: 'İri, güneş gibi açık bir yüz.',
    role: 'focal',
    headRadius: 5.6,
    defaultColor: '#f4b819',
    palette: [
      { name: 'Altın', hex: '#f4b819' },
      { name: 'Limon', hex: '#f6d84a' },
      { name: 'Turuncu', hex: '#ec8a1c' },
      { name: 'Bakır', hex: '#b5522a' },
      { name: 'Krem', hex: '#f1e2a8' },
    ],
    defaultStemLength: 44,
    stemRadius: 0.42,
    stemColor: '#5b7a33',
  },
  {
    type: 'peony',
    name: 'Şakayık',
    plural: 'şakayık',
    blurb: 'Dolgun, kat kat, yumuşak.',
    role: 'focal',
    headRadius: 5,
    defaultColor: '#f2c1c9',
    palette: [
      { name: 'Pudra', hex: '#f2c1c9' },
      { name: 'Fuşya', hex: '#d6457a' },
      { name: 'Krem', hex: '#f5e9dc' },
      { name: 'Mercan', hex: '#f39a88' },
      { name: 'Beyaz', hex: '#fbf6f2' },
      { name: 'Bordo', hex: '#8c1d3d' },
    ],
    defaultStemLength: 38,
    stemRadius: 0.3,
    stemColor: '#4f6b36',
  },
  {
    type: 'lily',
    name: 'Lilyum',
    plural: 'lilyum',
    blurb: 'Geriye kıvrılan uzun taç yapraklar.',
    role: 'focal',
    headRadius: 5.4,
    defaultColor: '#faf8f2',
    palette: [
      { name: 'Beyaz', hex: '#faf8f2' },
      { name: 'Pembe', hex: '#e06d9c' },
      { name: 'Turuncu', hex: '#f08a3e' },
      { name: 'Sarı', hex: '#f6cf4a' },
      { name: 'Somon', hex: '#f6a28c' },
    ],
    defaultStemLength: 46,
    stemRadius: 0.3,
    stemColor: '#58773a',
  },
  {
    type: 'lavender',
    name: 'Lavanta',
    plural: 'lavanta',
    blurb: 'İnce başak, küçük çiçek kümeleri.',
    role: 'spike',
    headRadius: 1.2,
    defaultColor: '#8e7cc3',
    palette: [
      { name: 'Lavanta', hex: '#8e7cc3' },
      { name: 'Koyu mor', hex: '#5f4b8b' },
      { name: 'Açık', hex: '#b4a7dc' },
      { name: 'Beyaz', hex: '#ece8f2' },
    ],
    defaultStemLength: 42,
    stemRadius: 0.1,
    stemColor: '#6d7d5c',
  },
  {
    type: 'hydrangea',
    name: 'Ortanca',
    plural: 'ortanca',
    blurb: 'Yüzlerce küçük çiçekten bir top.',
    role: 'focal',
    headRadius: 5.8,
    defaultColor: '#8fa8dc',
    palette: [
      { name: 'Mavi', hex: '#8fa8dc' },
      { name: 'Mor', hex: '#9b7fc0' },
      { name: 'Pembe', hex: '#eaa9c0' },
      { name: 'Beyaz', hex: '#f2f0ea' },
      { name: 'Yeşil', hex: '#c8d8a8' },
      { name: 'Lila', hex: '#c2b4e2' },
    ],
    defaultStemLength: 36,
    stemRadius: 0.36,
    stemColor: '#4c6633',
  },
  {
    type: 'carnation',
    name: 'Karanfil',
    plural: 'karanfil',
    blurb: 'Tırtıklı kenarlı, sık yapraklı.',
    role: 'middle',
    headRadius: 3,
    defaultColor: '#f19cb7',
    palette: [
      { name: 'Pembe', hex: '#f19cb7' },
      { name: 'Kırmızı', hex: '#c8102e' },
      { name: 'Beyaz', hex: '#f7f4ee' },
      { name: 'Sarı', hex: '#f4d35e' },
      { name: 'Mor', hex: '#7c3f8c' },
      { name: 'Şeftali', hex: '#f7b89b' },
      { name: 'Yeşil', hex: '#b5cf7c' },
    ],
    defaultStemLength: 38,
    stemRadius: 0.17,
    stemColor: '#7d9a85',
  },
  {
    type: 'hyacinth',
    name: 'Sümbül',
    plural: 'sümbül',
    blurb: 'Yıldız çiçekli, dolgun başak.',
    role: 'spike',
    headRadius: 2.6,
    defaultColor: '#8f9be0',
    palette: [
      { name: 'Mavi', hex: '#8f9be0' },
      { name: 'Pembe', hex: '#f19bc0' },
      { name: 'Beyaz', hex: '#f6f3ef' },
      { name: 'Mor', hex: '#7a4fa3' },
      { name: 'Lila', hex: '#b6a3e3' },
    ],
    defaultStemLength: 30,
    stemRadius: 0.44,
    stemColor: '#7a9a55',
  },
  {
    type: 'poppy',
    name: 'Gelincik',
    plural: 'gelincik',
    blurb: 'Kâğıt gibi ince, buruşuk yapraklar.',
    role: 'middle',
    headRadius: 4,
    defaultColor: '#e0442e',
    palette: [
      { name: 'Kırmızı', hex: '#e0442e' },
      { name: 'Turuncu', hex: '#f2793a' },
      { name: 'Beyaz', hex: '#f7f2ec' },
      { name: 'Pembe', hex: '#f2a2b3' },
      { name: 'Sarı', hex: '#f5c842' },
    ],
    defaultStemLength: 38,
    stemRadius: 0.13,
    stemColor: '#86a06a',
  },
]

export const FLOWER_MAP: Record<FlowerType, FlowerInfo> = Object.fromEntries(
  FLOWERS.map((f) => [f.type, f]),
) as Record<FlowerType, FlowerInfo>

export interface ShapeInfo {
  id: BouquetShape
  name: string
  blurb: string
}

export const SHAPES: ShapeInfo[] = [
  { id: 'classic', name: 'Klasik', blurb: 'Ortası yüksek, dengeli' },
  { id: 'round', name: 'Yuvarlak', blurb: 'Sıkı, kubbe gibi' },
  { id: 'handtied', name: 'El buketi', blurb: 'Gevşek, sarmal saplı' },
  { id: 'cascade', name: 'Şelale', blurb: 'Öne doğru akan' },
  { id: 'wild', name: 'Doğal', blurb: 'Dağınık, kırdan toplanmış gibi' },
  { id: 'minimal', name: 'Minimal', blurb: 'Az dal, bol boşluk' },
  { id: 'grand', name: 'Gösterişli', blurb: 'Büyük ve dolgun' },
]

export const GREENERY: { id: Greenery; name: string }[] = [
  { id: 'none', name: 'Yok' },
  { id: 'light', name: 'Biraz' },
  { id: 'lush', name: 'Bol' },
]

export interface WrapInfo {
  id: WrapMaterial
  name: string
  defaultColor: string
  palette: Swatch[]
}

export const WRAPS: WrapInfo[] = [
  {
    id: 'kraft',
    name: 'Kraft kâğıt',
    defaultColor: '#c49a6c',
    palette: [
      { name: 'Doğal', hex: '#c49a6c' },
      { name: 'Açık', hex: '#d8b994' },
      { name: 'Koyu', hex: '#9c7350' },
    ],
  },
  {
    id: 'white',
    name: 'Beyaz',
    defaultColor: '#f5f1ea',
    palette: [
      { name: 'Kırık beyaz', hex: '#f5f1ea' },
      { name: 'Saf beyaz', hex: '#fbfbf9' },
      { name: 'Krem', hex: '#efe4d0' },
    ],
  },
  {
    id: 'pink',
    name: 'Pembe',
    defaultColor: '#efc4c4',
    palette: [
      { name: 'Toz pembe', hex: '#efc4c4' },
      { name: 'Gül kurusu', hex: '#d6a0a0' },
      { name: 'Şeftali', hex: '#f3cdb8' },
      { name: 'Açık', hex: '#f7dfe0' },
    ],
  },
  {
    id: 'clear',
    name: 'Şeffaf',
    defaultColor: '#ffffff',
    palette: [
      { name: 'Şeffaf', hex: '#ffffff' },
      { name: 'Buzlu', hex: '#e8eef0' },
      { name: 'Pembe tül', hex: '#f6dde3' },
    ],
  },
  {
    id: 'fabric',
    name: 'Kumaş',
    defaultColor: '#dccdb5',
    palette: [
      { name: 'Keten', hex: '#dccdb5' },
      { name: 'Adaçayı', hex: '#b8c4ad' },
      { name: 'Gül', hex: '#d9b3ae' },
      { name: 'Lacivert', hex: '#3e4a63' },
      { name: 'Kahve', hex: '#8a6a52' },
    ],
  },
  {
    id: 'none',
    name: 'Ambalajsız',
    defaultColor: '#ffffff',
    palette: [],
  },
]

export const WRAP_MAP = Object.fromEntries(WRAPS.map((w) => [w.id, w])) as Record<WrapMaterial, WrapInfo>

export const WRAP_SHAPES: { id: WrapShape; name: string; blurb: string }[] = [
  { id: 'layered', name: 'Katmanlı', blurb: 'Üst üste kâğıtlar' },
  { id: 'cone', name: 'Külah', blurb: 'Tek parça, sivri' },
  { id: 'open', name: 'Önü açık', blurb: 'Sadece arkayı sarar' },
]

export const RIBBONS: { id: RibbonStyle; name: string; blurb: string }[] = [
  { id: 'satin', name: 'Saten kurdele', blurb: 'Parlak, yumuşak' },
  { id: 'grosgrain', name: 'Renkli kurdele', blurb: 'Mat, dokulu' },
  { id: 'twine', name: 'İp bağlama', blurb: 'Minimal jüt ip' },
  { id: 'none', name: 'Bağsız', blurb: '' },
]

export const RIBBON_COLORS: Swatch[] = [
  { name: 'Fildişi', hex: '#efe6dc' },
  { name: 'Gül kurusu', hex: '#d8a3a6' },
  { name: 'Adaçayı', hex: '#9fb39a' },
  { name: 'Bordo', hex: '#7c2335' },
  { name: 'Lacivert', hex: '#2f3b57' },
  { name: 'Altın', hex: '#c9a45c' },
  { name: 'Siyah', hex: '#2a2626' },
  { name: 'Jüt', hex: '#b89a6e' },
]

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createFlowerGroup(type: FlowerType, count = 1, color?: string): FlowerGroup {
  const info = FLOWER_MAP[type]
  return {
    id: newId(),
    type,
    color: color ?? info.defaultColor,
    count,
    stemLength: info.defaultStemLength,
    size: 1,
    tilt: 0,
    turn: 0,
    placement: { mode: 'auto', angle: 0, radius: 0.5, height: 0 },
  }
}

export function defaultPackaging(): Packaging {
  return {
    wrapMaterial: 'kraft',
    wrapColor: '#c49a6c',
    wrapShape: 'layered',
    ribbonStyle: 'satin',
    ribbonColor: '#efe6dc',
    bow: true,
  }
}

/** Stüdyo boş açılmasın: düzenlenebilir bir başlangıç buketi. */
export function starterDesign(): BouquetDesign {
  return {
    shape: 'classic',
    greenery: 'light',
    seed: Math.floor(Math.random() * 1000),
    flowers: [
      createFlowerGroup('rose', 5, '#e8a5ad'),
      createFlowerGroup('daisy', 4, '#ffffff'),
      createFlowerGroup('lavender', 4, '#8e7cc3'),
    ],
    packaging: defaultPackaging(),
  }
}

export const MAX_STEMS = 60
export const MAX_GROUPS = 24
export const MAX_PER_GROUP = 15

export function stemCount(design: BouquetDesign): number {
  return design.flowers.reduce((sum, f) => sum + f.count, 0)
}

/** "5 gül, 3 lavanta" gibi kısa özet. */
export function describeFlowers(flowers: { type: FlowerType; count: number }[], limit = 3): string {
  const totals = new Map<FlowerType, number>()
  for (const f of flowers) totals.set(f.type, (totals.get(f.type) ?? 0) + f.count)
  const parts = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${FLOWER_MAP[type].plural}`)
  if (parts.length <= limit) return parts.join(', ')
  return parts.slice(0, limit).join(', ') + ` ve ${parts.length - limit} tür daha`
}
