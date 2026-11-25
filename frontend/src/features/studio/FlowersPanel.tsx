import { ChevronDown, Copy, Minus, Plus, ScanSearch, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFeedback } from '../../components/feedback'
import { Segmented, Slider } from '../../components/ui'
import { FLOWER_MAP, FLOWERS, MAX_PER_GROUP, MAX_STEMS, stemCount } from '../../domain/catalog'
import type { FlowerGroup, FlowerType } from '../../domain/types'
import { cn } from '../../lib/image'
import { ColorPicker, Swatches } from './ColorPicker'
import { useStudio } from './store'

let thumbCache: Record<FlowerType, string> | null = null

function useThumbnails() {
  const [thumbs, setThumbs] = useState(thumbCache)
  useEffect(() => {
    if (thumbCache) return
    let alive = true
    import('../../three/snapshot')
      .then((m) => m.getFlowerThumbnails())
      .then((t) => {
        thumbCache = t
        if (alive) setThumbs(t)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  return thumbs
}

function directionLabel(angle: number) {
  const a = ((angle % 360) + 360) % 360
  if (a < 23 || a >= 338) return 'ön'
  if (a < 68) return 'ön sağ'
  if (a < 113) return 'sağ'
  if (a < 158) return 'arka sağ'
  if (a < 203) return 'arka'
  if (a < 248) return 'arka sol'
  if (a < 293) return 'sol'
  return 'ön sol'
}

function GroupEditor({ group, onFocus }: { group: FlowerGroup; onFocus: () => void }) {
  const info = FLOWER_MAP[group.type]
  const { updateFlower, checkpoint, removeFlower, duplicateFlower } = useStudio()
  const [customOpen, setCustomOpen] = useState(!info.palette.some((p) => p.hex === group.color))
  const set = (patch: Partial<FlowerGroup>) => updateFlower(group.id, patch, false)
  const manual = group.placement.mode === 'manual'

  return (
    <div className="space-y-6 px-1 pb-2 pt-4">
      <section>
        <h4 className="mb-3 text-sm font-semibold text-ink-soft">Renk</h4>
        <Swatches
          swatches={info.palette}
          value={group.color}
          onPick={(hex) => updateFlower(group.id, { color: hex })}
          custom
          customOpen={customOpen}
          onCustom={() => setCustomOpen((v) => !v)}
        />
        {customOpen && (
          <div className="mt-4">
            <ColorPicker value={group.color} onChangeStart={checkpoint} onChange={(hex) => set({ color: hex })} />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <Slider label="Sap uzunluğu" value={group.stemLength} min={20} max={70} onChangeStart={checkpoint} onChange={(v) => set({ stemLength: v })} format={(v) => `${v} cm`} />
        <Slider label="Boyut" value={Math.round(group.size * 100)} min={60} max={150} step={5} onChangeStart={checkpoint} onChange={(v) => set({ size: v / 100 })} format={(v) => `%${v}`} />
        <Slider label="Eğim" value={group.tilt} min={-40} max={40} onChangeStart={checkpoint} onChange={(v) => set({ tilt: v })} format={(v) => (v === 0 ? 'doğal' : v > 0 ? `${v}° dışa` : `${-v}° içe`)} />
        <Slider label="Yön" value={group.turn} min={-180} max={180} step={5} onChangeStart={checkpoint} onChange={(v) => set({ turn: v })} format={(v) => (v === 0 ? 'doğal' : `${v > 0 ? '+' : ''}${v}°`)} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-ink-soft">Buketteki yeri</h4>
          <Segmented
            label="Yerleşim"
            size="sm"
            value={group.placement.mode}
            onChange={(mode) => updateFlower(group.id, { placement: { ...group.placement, mode } })}
            options={[
              { value: 'auto', label: 'Otomatik' },
              { value: 'manual', label: 'Elle' },
            ]}
          />
        </div>
        {manual ? (
          <>
            <Slider label="Konum" value={group.placement.angle} min={0} max={359} step={3} onChangeStart={checkpoint} onChange={(v) => set({ placement: { ...group.placement, angle: v } })} format={(v) => `${directionLabel(v)} · ${v}°`} />
            <Slider label="Merkeze uzaklık" value={Math.round(group.placement.radius * 100)} min={0} max={100} step={2} onChangeStart={checkpoint} onChange={(v) => set({ placement: { ...group.placement, radius: v / 100 } })} format={(v) => (v < 15 ? 'merkez' : v > 80 ? 'kenar' : `%${v}`)} />
            <Slider label="Yükseklik" value={group.placement.height} min={-10} max={15} onChangeStart={checkpoint} onChange={(v) => set({ placement: { ...group.placement, height: v } })} format={(v) => (v === 0 ? 'hizada' : `${v > 0 ? '+' : ''}${v} cm`)} />
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">Seçtiğin buket şekline göre yerleşir. Elle'ye geçip konumunu kendin belirleyebilirsin.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onFocus} className="inline-flex h-10 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-ink hover:bg-sand/70">
          <ScanSearch className="size-4" /> Yakından bak
        </button>
        <button type="button" onClick={() => duplicateFlower(group.id)} className="inline-flex h-10 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-ink hover:bg-sand/70">
          <Copy className="size-4" /> Çoğalt
        </button>
        <button type="button" onClick={() => removeFlower(group.id)} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-blush-700 hover:bg-blush-50">
          <Trash className="size-4" /> Kaldır
        </button>
      </div>
    </div>
  )
}

export function FlowersPanel({ onFocusGroup }: { onFocusGroup: (id: string) => void }) {
  const { design, selectedId, select, addFlower, setCount } = useStudio()
  const { toast } = useFeedback()
  const thumbs = useThumbnails()
  const total = stemCount(design)
  const countByType = new Map<FlowerType, number>()
  for (const f of design.flowers) countByType.set(f.type, (countByType.get(f.type) ?? 0) + f.count)

  // 3D'de dokunulan çiçeğin satırı görünür olsun
  useEffect(() => {
    if (!selectedId) return
    const t = window.setTimeout(() => document.getElementById(`group-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80)
    return () => window.clearTimeout(t)
  }, [selectedId])

  const add = (type: FlowerType) => {
    const result = addFlower(type)
    if (result === 'limit') toast(`Bir bukete en fazla ${MAX_STEMS} dal sığar.`, 'error')
  }

  return (
    <div className="space-y-7">
      {design.flowers.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-display text-lg text-ink">Buketindekiler</h3>
            <span className="text-sm text-muted tabular-nums">
              {total} dal · {design.flowers.length} grup
            </span>
          </div>
          <ul className="divide-y divide-line/70 rounded-2xl border border-line/70 bg-paper">
            {design.flowers.map((g) => {
              const info = FLOWER_MAP[g.type]
              const open = g.id === selectedId
              return (
                <li key={g.id} id={`group-${g.id}`} className={cn('scroll-mt-4 px-3 transition', open && 'bg-cream/60')}>
                  <div className="flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => select(open ? null : g.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-expanded={open}
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ivory">
                        {thumbs && <img src={thumbs[g.type]} alt="" className="size-full object-contain p-0.5" />}
                        <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-paper" style={{ background: g.color }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{info.name}</span>
                        <span className="block text-[13px] text-muted">
                          {g.stemLength} cm{g.placement.mode === 'manual' ? ' · elle' : ''}
                        </span>
                      </span>
                      <ChevronDown className={cn('ml-auto size-4 shrink-0 text-muted transition', open && 'rotate-180')} />
                    </button>
                    <div className="flex items-center rounded-full bg-ivory">
                      <button
                        type="button"
                        onClick={() => (g.count > 1 ? setCount(g.id, g.count - 1) : undefined)}
                        disabled={g.count <= 1}
                        className="inline-flex size-10 items-center justify-center rounded-full text-ink disabled:opacity-30"
                        aria-label={`${info.name} sayısını azalt`}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
                        {g.count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCount(g.id, g.count + 1)}
                        disabled={g.count >= MAX_PER_GROUP || total >= MAX_STEMS}
                        className="inline-flex size-10 items-center justify-center rounded-full text-ink disabled:opacity-30"
                        aria-label={`${info.name} sayısını artır`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  {open && <GroupEditor group={g} onFocus={() => onFocusGroup(g.id)} />}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-lg text-ink">Çiçek ekle</h3>
          <span className="text-sm text-muted">Dokun, buketine girsin</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-3">
          {FLOWERS.map((f) => {
            const n = countByType.get(f.type) ?? 0
            return (
              <button
                key={f.type}
                type="button"
                onClick={() => add(f.type)}
                className="group relative flex flex-col items-center rounded-2xl border border-line/70 bg-paper px-1.5 pb-2.5 pt-1.5 text-center transition hover:border-ink/20 hover:shadow-soft active:scale-[0.97]"
                aria-label={`${f.name} ekle${n ? `, bukette ${n} tane var` : ''}`}
              >
                <span className="flex aspect-square w-full items-center justify-center">
                  {thumbs ? (
                    <img src={thumbs[f.type]} alt="" className="size-full object-contain transition duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="size-3/5 animate-pulse rounded-full" style={{ background: f.defaultColor, opacity: 0.35 }} />
                  )}
                </span>
                <span className="text-[13px] font-semibold text-ink">{f.name}</span>
                {n > 0 && (
                  <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold leading-5 text-cream">
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
