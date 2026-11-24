import { useEffect, useMemo, useState } from 'react'
import { createFlowerGroup, FLOWERS } from '../domain/catalog'
import type { BouquetDesign, BouquetShape, FlowerType, RibbonStyle, WrapMaterial, WrapShape } from '../domain/types'
import { BouquetViewer } from '../three/BouquetViewer'
import { getFlowerThumbnails } from '../three/snapshot'

/** Yalnızca geliştirmede: modelleri ve buket şekillerini hızlıca görmek için. */
export default function LabPage() {
  const params = new URLSearchParams(window.location.search)
  const only = params.get('flower') as FlowerType | null
  const shape = (params.get('shape') as BouquetShape) ?? 'classic'
  const wrap = (params.get('wrap') as WrapMaterial) ?? 'kraft'
  const wrapShape = (params.get('wrapShape') as WrapShape) ?? 'layered'
  const ribbon = (params.get('ribbon') as RibbonStyle) ?? 'satin'
  const count = Number(params.get('count') ?? 1)
  const thumbs = params.get('thumbs') === '1'

  const design = useMemo<BouquetDesign>(() => {
    const flowers = only
      ? [createFlowerGroup(only, count)]
      : [
          createFlowerGroup('rose', 5, '#e8a5ad'),
          createFlowerGroup('daisy', 4, '#ffffff'),
          createFlowerGroup('lavender', 4, '#8e7cc3'),
        ]
    return {
      shape,
      greenery: (params.get('greenery') as BouquetDesign['greenery']) ?? (only ? 'none' : 'light'),
      seed: 7,
      flowers,
      packaging: {
        wrapMaterial: only ? 'none' : wrap,
        wrapColor: wrap === 'kraft' ? '#c49a6c' : wrap === 'pink' ? '#efc4c4' : wrap === 'fabric' ? '#dccdb5' : '#f5f1ea',
        wrapShape,
        ribbonStyle: only ? 'none' : ribbon,
        ribbonColor: ribbon === 'twine' ? '#b89a6e' : '#efe6dc',
        bow: true,
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [urls, setUrls] = useState<Record<string, string> | null>(null)
  useEffect(() => {
    if (thumbs) getFlowerThumbnails().then(setUrls)
  }, [thumbs])

  if (thumbs) {
    return (
      <div className="grid grid-cols-4 gap-2 bg-ivory p-4">
        {FLOWERS.map((f) => (
          <div key={f.type} className="rounded-xl bg-paper p-2 text-center text-xs">
            {urls ? <img src={urls[f.type]} alt={f.name} className="mx-auto h-40 w-40" /> : '...'}
            {f.name}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="stage-bg h-dvh w-full">
      <BouquetViewer design={design} className="h-full w-full" />
    </div>
  )
}
