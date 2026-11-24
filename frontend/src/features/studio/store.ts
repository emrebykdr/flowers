import { create } from 'zustand'
import {
  createFlowerGroup,
  FLOWER_MAP,
  MAX_GROUPS,
  MAX_PER_GROUP,
  MAX_STEMS,
  newId,
  stemCount,
  WRAP_MAP,
} from '../../domain/catalog'
import type { BouquetDesign, BouquetShape, FlowerGroup, FlowerType, Greenery, Packaging } from '../../domain/types'

const HISTORY_LIMIT = 60
const DRAFT_KEY = 'ourbloom:studio-draft:v1'

export interface StudioMeta {
  name: string
  note: string
  memoryDate: string
}

interface StudioState extends StudioMeta {
  /** 'new' ya da buket kimliği: hangi tasarımın yüklü olduğu. */
  loadedKey: string | null
  bouquetId: string | null
  design: BouquetDesign
  selectedId: string | null
  past: BouquetDesign[]
  future: BouquetDesign[]
  dirty: boolean
  restoredDraft: boolean

  init: (args: { key: string; bouquetId: string | null; design: BouquetDesign; meta: StudioMeta; restoredDraft?: boolean }) => void
  select: (id: string | null) => void
  checkpoint: () => void
  addFlower: (type: FlowerType) => 'added' | 'incremented' | 'limit'
  updateFlower: (id: string, patch: Partial<FlowerGroup>, history?: boolean) => void
  setCount: (id: string, count: number) => void
  removeFlower: (id: string) => void
  duplicateFlower: (id: string) => void
  setShape: (shape: BouquetShape) => void
  setGreenery: (g: Greenery) => void
  reshuffle: () => void
  resetPlacements: () => void
  setPackaging: (patch: Partial<Packaging>, history?: boolean) => void
  clearFlowers: () => void
  undo: () => void
  redo: () => void
  setMeta: (patch: Partial<StudioMeta>) => void
  markSaved: (bouquetId: string, key: string) => void
}

const same = (a: BouquetDesign, b: BouquetDesign) => JSON.stringify(a) === JSON.stringify(b)

export const useStudio = create<StudioState>((set, get) => {
  /** Tasarımı değiştirir; history true ise önceki hâl geri alma yığınına girer. */
  const change = (fn: (d: BouquetDesign) => BouquetDesign, history = true) => {
    const { design, past } = get()
    const next = fn(design)
    if (next === design) return
    set({
      design: next,
      dirty: true,
      ...(history ? { past: [...past, design].slice(-HISTORY_LIMIT), future: [] } : {}),
    })
  }

  const mapFlower = (id: string, fn: (f: FlowerGroup) => FlowerGroup) => (d: BouquetDesign) => ({
    ...d,
    flowers: d.flowers.map((f) => (f.id === id ? fn(f) : f)),
  })

  return {
    loadedKey: null,
    bouquetId: null,
    design: { shape: 'classic', greenery: 'light', seed: 1, flowers: [], packaging: { wrapMaterial: 'kraft', wrapColor: '#c49a6c', wrapShape: 'layered', ribbonStyle: 'satin', ribbonColor: '#efe6dc', bow: true } },
    selectedId: null,
    past: [],
    future: [],
    dirty: false,
    restoredDraft: false,
    name: '',
    note: '',
    memoryDate: '',

    init: ({ key, bouquetId, design, meta, restoredDraft }) =>
      set({
        loadedKey: key,
        bouquetId,
        design,
        ...meta,
        selectedId: null,
        past: [],
        future: [],
        dirty: !!restoredDraft,
        restoredDraft: !!restoredDraft,
      }),

    select: (id) => set({ selectedId: id }),

    checkpoint: () => {
      const { design, past } = get()
      if (past.length && same(past[past.length - 1], design)) return
      set({ past: [...past, design].slice(-HISTORY_LIMIT), future: [] })
    },

    addFlower: (type) => {
      const { design, selectedId } = get()
      const total = stemCount(design)
      if (total >= MAX_STEMS) return 'limit'
      const selected = design.flowers.find((f) => f.id === selectedId)
      if (selected && selected.type === type && selected.count < MAX_PER_GROUP) {
        change(mapFlower(selected.id, (f) => ({ ...f, count: f.count + 1 })))
        return 'incremented'
      }
      if (design.flowers.length >= MAX_GROUPS) return 'limit'
      const group = createFlowerGroup(type, 1)
      change((d) => ({ ...d, flowers: [...d.flowers, group] }))
      set({ selectedId: group.id })
      return 'added'
    },

    updateFlower: (id, patch, history = true) => change(mapFlower(id, (f) => ({ ...f, ...patch })), history),

    setCount: (id, count) => {
      const { design } = get()
      const current = design.flowers.find((f) => f.id === id)
      if (!current) return
      const others = stemCount(design) - current.count
      const clamped = Math.max(1, Math.min(MAX_PER_GROUP, count, MAX_STEMS - others))
      if (clamped === current.count) return
      change(mapFlower(id, (f) => ({ ...f, count: clamped })))
    },

    removeFlower: (id) => {
      change((d) => ({ ...d, flowers: d.flowers.filter((f) => f.id !== id) }))
      if (get().selectedId === id) set({ selectedId: null })
    },

    duplicateFlower: (id) => {
      const { design } = get()
      const source = design.flowers.find((f) => f.id === id)
      if (!source || design.flowers.length >= MAX_GROUPS) return
      if (stemCount(design) + source.count > MAX_STEMS) return
      const copy: FlowerGroup = { ...source, id: newId(), placement: { ...source.placement } }
      change((d) => {
        const i = d.flowers.findIndex((f) => f.id === id)
        const flowers = [...d.flowers]
        flowers.splice(i + 1, 0, copy)
        return { ...d, flowers }
      })
      set({ selectedId: copy.id })
    },

    setShape: (shape) => change((d) => (d.shape === shape ? d : { ...d, shape })),
    setGreenery: (greenery) => change((d) => (d.greenery === greenery ? d : { ...d, greenery })),
    reshuffle: () => change((d) => ({ ...d, seed: (d.seed + 1 + Math.floor(Math.random() * 997)) % 100000 })),
    resetPlacements: () =>
      change((d) => ({
        ...d,
        flowers: d.flowers.map((f) => ({ ...f, tilt: 0, turn: 0, placement: { ...f.placement, mode: 'auto' } })),
      })),

    setPackaging: (patch, history = true) =>
      change((d) => {
        const packaging = { ...d.packaging, ...patch }
        // Malzeme değişince o malzemenin kendi rengine geç
        if (patch.wrapMaterial && patch.wrapMaterial !== d.packaging.wrapMaterial && !patch.wrapColor) {
          packaging.wrapColor = WRAP_MAP[patch.wrapMaterial].defaultColor
        }
        if (patch.ribbonStyle === 'twine' && d.packaging.ribbonStyle !== 'twine' && !patch.ribbonColor) {
          packaging.ribbonColor = '#b89a6e'
        }
        return { ...d, packaging }
      }, history),

    clearFlowers: () => {
      change((d) => ({ ...d, flowers: [] }))
      set({ selectedId: null })
    },

    undo: () => {
      const { past, future, design } = get()
      if (!past.length) return
      const prev = past[past.length - 1]
      set({ design: prev, past: past.slice(0, -1), future: [design, ...future].slice(0, HISTORY_LIMIT), dirty: true })
      const sel = get().selectedId
      if (sel && !prev.flowers.some((f) => f.id === sel)) set({ selectedId: null })
    },

    redo: () => {
      const { past, future, design } = get()
      if (!future.length) return
      const next = future[0]
      set({ design: next, past: [...past, design].slice(-HISTORY_LIMIT), future: future.slice(1), dirty: true })
    },

    setMeta: (patch) => set({ ...patch, dirty: true }),

    markSaved: (bouquetId, key) => set({ bouquetId, loadedKey: key, dirty: false, restoredDraft: false }),
  }
})

// ---------------------------------------------------------------------------
// Yeni tasarım taslağı: sayfa yenilense de kaybolmasın (yalnızca bu cihazda)
// ---------------------------------------------------------------------------

interface Draft {
  design: BouquetDesign
  meta: StudioMeta
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (!draft?.design?.flowers || !Array.isArray(draft.design.flowers)) return null
    draft.design.flowers = draft.design.flowers.filter((f) => FLOWER_MAP[f.type])
    return draft
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // depolama kapalı olabilir
  }
}

let draftTimer: number | undefined
useStudio.subscribe((state) => {
  if (state.loadedKey !== 'new' || !state.dirty) return
  window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(() => {
    try {
      const draft: Draft = { design: state.design, meta: { name: state.name, note: state.note, memoryDate: state.memoryDate } }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // önemli değil
    }
  }, 400)
})
