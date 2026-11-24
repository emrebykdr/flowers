export type FlowerType =
  | 'rose'
  | 'tulip'
  | 'daisy'
  | 'orchid'
  | 'sunflower'
  | 'peony'
  | 'lily'
  | 'lavender'
  | 'hydrangea'
  | 'carnation'
  | 'hyacinth'
  | 'poppy'

export type BouquetShape = 'round' | 'classic' | 'cascade' | 'handtied' | 'wild' | 'minimal' | 'grand'
export type Greenery = 'none' | 'light' | 'lush'
export type WrapMaterial = 'kraft' | 'white' | 'pink' | 'clear' | 'fabric' | 'none'
export type WrapShape = 'cone' | 'layered' | 'open'
export type RibbonStyle = 'satin' | 'grosgrain' | 'twine' | 'none'

export interface FlowerPlacement {
  mode: 'auto' | 'manual'
  /** Buket çevresinde açı, derece 0-360 (0 = ön). */
  angle: number
  /** Merkezden uzaklık 0-1. */
  radius: number
  /** Yükseklik farkı, cm. */
  height: number
}

export interface FlowerGroup {
  id: string
  type: FlowerType
  color: string
  count: number
  /** cm */
  stemLength: number
  /** 1 = doğal boy */
  size: number
  /** derece, + dışa */
  tilt: number
  /** derece, baktığı yönü çevirir */
  turn: number
  placement: FlowerPlacement
}

export interface Packaging {
  wrapMaterial: WrapMaterial
  wrapColor: string
  wrapShape: WrapShape
  ribbonStyle: RibbonStyle
  ribbonColor: string
  bow: boolean
}

export interface BouquetDesign {
  shape: BouquetShape
  greenery: Greenery
  seed: number
  flowers: FlowerGroup[]
  packaging: Packaging
}

// ---- API ----

export interface UserInfo {
  id: string
  username: string
  displayName: string
}

export interface SpaceInfo {
  id: string
  name: string
  togetherSince: string | null
}

export interface Session {
  user: UserInfo
  partner: UserInfo | null
  space: SpaceInfo
}

export interface FlowerSummary {
  type: FlowerType
  color: string
  count: number
}

export interface BouquetSummary {
  id: string
  name: string
  note: string | null
  memoryDate: string
  createdAt: string
  updatedAt: string
  owner: UserInfo
  isMine: boolean
  previewUrl: string | null
  shape: BouquetShape
  stemCount: number
  flowers: FlowerSummary[]
  copiedFromId: string | null
}

export interface BouquetDetail {
  summary: BouquetSummary
  design: BouquetDesign
}

export interface MemoryItem {
  id: string
  title: string
  body: string | null
  date: string
  createdAt: string
  author: UserInfo
  isMine: boolean
  photoUrl: string | null
  bouquet: { id: string; name: string; previewUrl: string | null } | null
}

export interface MessageItem {
  id: string
  body: string
  createdAt: string
  readAt: string | null
  sender: UserInfo
  isMine: boolean
}

export interface HomeData {
  session: Session
  latestBouquet: BouquetSummary | null
  recentMemories: MemoryItem[]
  latestFromPartner: MessageItem | null
  unreadCount: number
  bouquetCount: number
  memoryCount: number
}
