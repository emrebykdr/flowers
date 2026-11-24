import { useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import type { Material, MeshStandardMaterial } from 'three'
import type { BouquetDesign, FlowerGroup } from '../domain/types'
import { buildFoliage } from './foliage'
import { accentColor, getHeadModel } from './flowers'
import { computeLayout, layoutKey, type BouquetLayout, type StemLayout } from './layout'
import {
  createPetalMaterial,
  createRibbonMaterial,
  createWrapMaterial,
  fixedMaterial,
  innerWrapColor,
  leafMaterial,
  stemMaterial,
} from './materials'
import { buildRibbon, buildWrap } from './wrap'

interface GroupMaterials {
  petal: MeshStandardMaterial
  petal2: MeshStandardMaterial
}

/** Her çiçek grubunun kendi malzemesi: renk değişince geometri değil yalnızca renk güncellenir. */
function useGroupMaterials(flowers: FlowerGroup[], selectedId: string | null | undefined) {
  const invalidate = useThree((s) => s.invalidate)
  const ref = useRef(new Map<string, GroupMaterials>())
  const map = ref.current
  for (const f of flowers) {
    if (!map.has(f.id)) map.set(f.id, { petal: createPetalMaterial(f.color), petal2: createPetalMaterial(accentColor(f.color)) })
  }

  useEffect(() => {
    const ids = new Set(flowers.map((f) => f.id))
    for (const [id, m] of map) {
      if (!ids.has(id)) {
        m.petal.dispose()
        m.petal2.dispose()
        map.delete(id)
      }
    }
    for (const f of flowers) {
      const m = map.get(f.id)
      if (!m) continue
      m.petal.color.set(f.color)
      m.petal2.color.set(accentColor(f.color))
      const selected = f.id === selectedId
      m.petal.emissive.set(selected ? '#fff4ec' : '#000000')
      m.petal.emissiveIntensity = selected ? 0.16 : 0
    }
    invalidate()
  })

  useEffect(
    () => () => {
      for (const m of map.values()) {
        m.petal.dispose()
        m.petal2.dispose()
      }
      map.clear()
    },
    [map],
  )
  return map
}

interface HeadProps {
  stem: StemLayout
  petal: Material
  petal2: Material
  onSelect?: (groupId: string) => void
}

const FlowerHead = memo(function FlowerHead({ stem, petal, petal2, onSelect }: HeadProps) {
  const model = getHeadModel(stem.type, stem.variant)
  const fixed = fixedMaterial()
  const handleClick = onSelect
    ? (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) return
        e.stopPropagation()
        onSelect(stem.groupId)
      }
    : undefined
  return (
    <group
      position={stem.head}
      quaternion={stem.quaternion}
      scale={stem.scale}
      onClick={handleClick}
      onPointerOver={onSelect ? () => (document.body.style.cursor = 'pointer') : undefined}
      onPointerOut={onSelect ? () => (document.body.style.cursor = '') : undefined}
    >
      {model.parts.map((p, i) => (
        <mesh
          key={i}
          geometry={p.geometry}
          material={p.kind === 'petal' ? petal : p.kind === 'petal2' ? petal2 : fixed}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
})

export interface BouquetModelProps {
  design: BouquetDesign
  layout?: BouquetLayout
  selectedGroupId?: string | null
  onSelectGroup?: (groupId: string) => void
  onLayout?: (layout: BouquetLayout) => void
}

export function BouquetModel({ design, layout: given, selectedGroupId, onSelectGroup, onLayout }: BouquetModelProps) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const pk = design.packaging
  const lk = layoutKey(design)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => given ?? computeLayout(design), [given, lk])
  const foliage = useMemo(() => buildFoliage(layout), [layout])
  const wrap = useMemo(() => buildWrap(layout, pk), [layout, pk.wrapMaterial, pk.wrapShape]) // eslint-disable-line react-hooks/exhaustive-deps
  const ribbon = useMemo(() => buildRibbon(pk, wrap.neckRadius), [pk.ribbonStyle, pk.bow, wrap.neckRadius]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    foliage.stems.dispose()
    foliage.leaves.dispose()
  }, [foliage])
  useEffect(() => () => {
    wrap.outer?.dispose()
    wrap.inner?.dispose()
  }, [wrap])
  useEffect(() => () => ribbon?.dispose(), [ribbon])

  const wrapMat = useMemo(() => createWrapMaterial(pk.wrapMaterial, pk.wrapColor), [pk.wrapMaterial]) // eslint-disable-line react-hooks/exhaustive-deps
  const innerMat = useMemo(() => createWrapMaterial(pk.wrapMaterial === 'clear' ? 'white' : pk.wrapMaterial, innerWrapColor(pk.wrapMaterial, pk.wrapColor)), [pk.wrapMaterial]) // eslint-disable-line react-hooks/exhaustive-deps
  const ribbonMat = useMemo(() => createRibbonMaterial(pk.ribbonStyle, pk.ribbonColor), [pk.ribbonStyle]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => wrapMat.dispose(), [wrapMat])
  useEffect(() => () => innerMat.dispose(), [innerMat])
  useEffect(() => () => ribbonMat.dispose(), [ribbonMat])

  useEffect(() => {
    ;(wrapMat as MeshStandardMaterial).color.set(pk.wrapColor)
    ;(innerMat as MeshStandardMaterial).color.set(innerWrapColor(pk.wrapMaterial, pk.wrapColor))
    ;(ribbonMat as MeshStandardMaterial).color.set(pk.ribbonColor)
    invalidate()
  }, [wrapMat, innerMat, ribbonMat, pk.wrapColor, pk.ribbonColor, pk.wrapMaterial, invalidate])

  const materials = useGroupMaterials(design.flowers, selectedGroupId)

  // Gölge haritası yalnızca buket değişince yeniden çizilir (kamera dönerken değil).
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    invalidate()
    onLayout?.(layout)
  }, [gl, layout, wrap, ribbon, invalidate, onLayout])

  const clear = pk.wrapMaterial === 'clear'

  return (
    <group dispose={null}>
      {layout.stems.map((s) => {
        const m = materials.get(s.groupId)
        if (!m) return null
        return <FlowerHead key={s.key} stem={s} petal={m.petal} petal2={m.petal2} onSelect={onSelectGroup} />
      })}
      <mesh geometry={foliage.stems} material={stemMaterial()} castShadow receiveShadow />
      <mesh geometry={foliage.leaves} material={leafMaterial()} castShadow receiveShadow />
      {wrap.outer && <mesh geometry={wrap.outer} material={wrapMat} castShadow={!clear} receiveShadow={!clear} renderOrder={clear ? 2 : 0} />}
      {wrap.inner && <mesh geometry={wrap.inner} material={innerMat} castShadow receiveShadow />}
      {ribbon && <mesh geometry={ribbon} material={ribbonMat} castShadow receiveShadow />}
    </group>
  )
}
