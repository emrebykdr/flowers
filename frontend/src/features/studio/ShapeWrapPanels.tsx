import { RotateCcw, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '../../components/ui'
import { GREENERY, RIBBON_COLORS, RIBBONS, SHAPES, WRAP_MAP, WRAP_SHAPES, WRAPS } from '../../domain/catalog'
import type { BouquetShape, RibbonStyle, WrapMaterial, WrapShape } from '../../domain/types'
import { cn } from '../../lib/image'
import { ColorPicker, Swatches } from './ColorPicker'
import { useStudio } from './store'

/** Buket şekli için küçük siluet. */
function ShapeIcon({ shape }: { shape: BouquetShape }) {
  const heads: [number, number, number][] = {
    round: [[0, -14, 7], [-11, -10, 6.5], [11, -10, 6.5], [-6, -22, 6], [6, -22, 6], [-15, -1, 5], [15, -1, 5], [0, -3, 6]],
    classic: [[0, -26, 6.5], [-9, -17, 6.5], [9, -17, 6.5], [-16, -6, 5.5], [16, -6, 5.5], [0, -11, 6], [-5, -3, 5], [6, -2, 5]],
    handtied: [[-3, -24, 6], [10, -18, 6], [-13, -14, 5.5], [3, -10, 6], [17, -6, 5], [-18, -2, 5], [-6, -2, 5]],
    cascade: [[0, -18, 6.5], [-11, -12, 6], [11, -12, 6], [0, -6, 6], [3, 6, 5], [-2, 15, 4.5], [2, 24, 4], [0, 32, 3.5]],
    wild: [[-6, -30, 4.5], [12, -22, 5.5], [-16, -16, 5], [2, -14, 6], [20, -6, 4], [-11, -4, 4.5], [8, 0, 4]],
    minimal: [[-6, -32, 5], [7, -24, 5], [-1, -14, 5.5]],
    grand: [[0, -20, 8], [-15, -14, 7.5], [15, -14, 7.5], [-24, -2, 6.5], [24, -2, 6.5], [-8, -4, 7], [9, -4, 7], [-6, -30, 6], [8, -30, 6]],
  }[shape] as [number, number, number][]
  return (
    <svg viewBox="-34 -42 68 84" className="h-16 w-14" aria-hidden>
      <path d="M -11 6 L 0 40 L 11 6 Z" fill="#e7d4bd" stroke="#b9a184" strokeWidth="0.9" />
      {heads.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? '#e2afa7' : i % 3 === 1 ? '#efccc6' : '#cbd7c1'} stroke="#8f4f4b" strokeOpacity="0.35" strokeWidth="0.9" />
      ))}
    </svg>
  )
}

export function ShapePanel() {
  const { design, setShape, setGreenery, reshuffle, resetPlacements } = useStudio()
  const hasManual = design.flowers.some((f) => f.placement.mode === 'manual' || f.tilt || f.turn)
  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 font-display text-lg text-ink">Buket şekli</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
          {SHAPES.map((s) => {
            const active = design.shape === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setShape(s.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border p-2 pr-3 text-left transition active:scale-[0.98]',
                  active ? 'border-ink bg-paper shadow-soft' : 'border-line/70 bg-paper hover:border-ink/20',
                )}
              >
                <ShapeIcon shape={s.id} />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{s.name}</span>
                  <span className="block text-[12.5px] leading-snug text-muted">{s.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">Çiçekler seçtiğin şekle göre kendiliğinden yerleşir.</p>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg text-ink">Yeşillik</h3>
        <Segmented
          label="Yeşillik"
          value={design.greenery}
          onChange={setGreenery}
          options={GREENERY.map((g) => ({ value: g.id, label: g.name }))}
          className="w-full"
        />
        <p className="mt-2 text-sm text-muted">Okaliptüs ve ruscus dalları; kenarları yumuşatır.</p>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg text-ink">Yerleşim</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reshuffle} className="inline-flex h-11 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-ink hover:bg-sand/70">
            <Shuffle className="size-4" /> Yeniden dağıt
          </button>
          <button
            type="button"
            onClick={resetPlacements}
            disabled={!hasManual}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-ink hover:bg-sand/70 disabled:opacity-40"
          >
            <RotateCcw className="size-4" /> Elle ayarları sıfırla
          </button>
        </div>
      </section>
    </div>
  )
}

function WrapSwatch({ id, color }: { id: WrapMaterial; color: string }) {
  if (id === 'none')
    return <span className="size-9 rounded-full border border-dashed border-ink/30 bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(45_41_38/0.08)_4px_5px)]" />
  if (id === 'clear')
    return <span className="size-9 rounded-full border border-ink/15 bg-[linear-gradient(135deg,rgb(255_255_255/0.9),rgb(220_232_238/0.5)_45%,rgb(255_255_255/0.85)_55%,rgb(210_225_232/0.4))] shadow-inner" />
  return (
    <span
      className="size-9 rounded-full border border-black/10"
      style={{
        background:
          id === 'fabric'
            ? `repeating-linear-gradient(0deg, rgb(255 255 255 / 0.18) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0 / 0.06) 0 1px, transparent 1px 3px), ${color}`
            : color,
      }}
    />
  )
}

export function WrapPanel() {
  const { design, setPackaging, checkpoint } = useStudio()
  const pk = design.packaging
  const wrap = WRAP_MAP[pk.wrapMaterial]
  const [wrapCustom, setWrapCustom] = useState(false)
  const [ribbonCustom, setRibbonCustom] = useState(false)
  const noWrap = pk.wrapMaterial === 'none'

  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 font-display text-lg text-ink">Ambalaj</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {WRAPS.map((w) => {
            const active = pk.wrapMaterial === w.id
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setPackaging({ wrapMaterial: w.id })}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border px-1 py-3 text-center transition active:scale-[0.98]',
                  active ? 'border-ink bg-paper shadow-soft' : 'border-line/70 bg-paper hover:border-ink/20',
                )}
              >
                <WrapSwatch id={w.id} color={active ? pk.wrapColor : w.defaultColor} />
                <span className="text-[13px] font-semibold leading-tight text-ink">{w.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {!noWrap && (
        <>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink-soft">Ambalaj rengi</h3>
            <Swatches
              swatches={wrap.palette}
              value={pk.wrapColor}
              onPick={(hex) => setPackaging({ wrapColor: hex })}
              custom
              customOpen={wrapCustom}
              onCustom={() => setWrapCustom((v) => !v)}
            />
            {wrapCustom && (
              <div className="mt-4">
                <ColorPicker value={pk.wrapColor} onChangeStart={checkpoint} onChange={(hex) => setPackaging({ wrapColor: hex }, false)} />
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink-soft">Sarım şekli</h3>
            <div className="grid grid-cols-3 gap-2">
              {WRAP_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPackaging({ wrapShape: s.id as WrapShape })}
                  aria-pressed={pk.wrapShape === s.id}
                  className={cn(
                    'rounded-2xl border px-2 py-2.5 text-center transition active:scale-[0.98]',
                    pk.wrapShape === s.id ? 'border-ink bg-paper shadow-soft' : 'border-line/70 bg-paper hover:border-ink/20',
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{s.name}</span>
                  <span className="block text-[12px] text-muted">{s.blurb}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section>
        <h3 className="mb-3 font-display text-lg text-ink">Kurdele</h3>
        <div className="grid grid-cols-2 gap-2">
          {RIBBONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPackaging({ ribbonStyle: r.id as RibbonStyle })}
              aria-pressed={pk.ribbonStyle === r.id}
              className={cn(
                'rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98]',
                pk.ribbonStyle === r.id ? 'border-ink bg-paper shadow-soft' : 'border-line/70 bg-paper hover:border-ink/20',
              )}
            >
              <span className="block text-sm font-semibold text-ink">{r.name}</span>
              {r.blurb && <span className="block text-[12px] text-muted">{r.blurb}</span>}
            </button>
          ))}
        </div>
      </section>

      {pk.ribbonStyle !== 'none' && (
        <>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink-soft">Kurdele rengi</h3>
            <Swatches
              swatches={RIBBON_COLORS}
              value={pk.ribbonColor}
              onPick={(hex) => setPackaging({ ribbonColor: hex })}
              custom
              customOpen={ribbonCustom}
              onCustom={() => setRibbonCustom((v) => !v)}
            />
            {ribbonCustom && (
              <div className="mt-4">
                <ColorPicker value={pk.ribbonColor} onChangeStart={checkpoint} onChange={(hex) => setPackaging({ ribbonColor: hex }, false)} />
              </div>
            )}
          </section>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-line/70 bg-paper px-4 py-3">
            <span>
              <span className="block font-semibold text-ink">Fiyonk</span>
              <span className="block text-sm text-muted">Önde iki ilmek ve sarkan uçlar</span>
            </span>
            <input
              type="checkbox"
              checked={pk.bow}
              onChange={(e) => setPackaging({ bow: e.target.checked })}
              className="peer sr-only"
            />
            <span className="relative h-7 w-12 rounded-full bg-sand transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-blush-500 after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition peer-checked:after:translate-x-5" />
          </label>
        </>
      )}
    </div>
  )
}
