import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { NeutralToneMapping, PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { BouquetDesign } from '../domain/types'
import { BouquetModel } from './BouquetModel'
import { fitPose } from './camera'
import { computeLayout, layoutKey, type BouquetLayout } from './layout'
import { GroundShadow, StudioLights } from './SceneSetup'

export interface ViewerHandle {
  resetView: () => void
  zoom: (factor: number) => void
  focusGroup: (groupId: string) => void
}

interface RigApi {
  reset: () => void
  zoom: (f: number) => void
  focus: (point: Vector3, distance: number) => void
}

interface Anim {
  fromPos: Vector3
  toPos: Vector3
  fromTarget: Vector3
  toTarget: Vector3
  t: number
  duration: number
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

function CameraRig({ layout, apiRef, fitOnLayoutChange }: { layout: BouquetLayout; apiRef: React.MutableRefObject<RigApi | null>; fitOnLayoutChange: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const anim = useRef<Anim | null>(null)
  const fitted = useRef(false)
  const lastExtent = useRef(layout.extent)

  const animateTo = useCallback(
    (toPos: Vector3, toTarget: Vector3, duration = 0.7) => {
      if (!controls) return
      anim.current = {
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget,
        t: 0,
        duration,
      }
      invalidate()
    },
    [camera, controls, invalidate],
  )

  const reset = useCallback(() => {
    const pose = fitPose(layout, camera, size.width / Math.max(1, size.height))
    animateTo(pose.position, pose.target)
  }, [layout, camera, size, animateTo])

  // İlk açılışta ve buket boyutu belirgin değişince kadrajı uyarla
  useEffect(() => {
    if (!controls) return
    const pose = fitPose(layout, camera, size.width / Math.max(1, size.height))
    if (!fitted.current) {
      camera.position.copy(pose.position)
      controls.target.copy(pose.target)
      controls.update()
      fitted.current = true
      lastExtent.current = layout.extent
      invalidate()
      return
    }
    if (fitOnLayoutChange && Math.abs(layout.extent - lastExtent.current) / lastExtent.current > 0.18) {
      lastExtent.current = layout.extent
      const dist = camera.position.distanceTo(controls.target)
      const dir = camera.position.clone().sub(controls.target).normalize()
      const want = pose.position.distanceTo(pose.target)
      animateTo(pose.target.clone().addScaledVector(dir, Math.max(dist, want * 0.9)), pose.target, 0.6)
    }
  }, [layout, controls, camera, size, fitOnLayoutChange, animateTo, invalidate])

  useEffect(() => {
    apiRef.current = {
      reset,
      zoom: (f) => {
        if (!controls) return
        const dir = camera.position.clone().sub(controls.target)
        const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, dir.length() * f))
        animateTo(controls.target.clone().add(dir.setLength(len)), controls.target.clone(), 0.35)
      },
      focus: (point, distance) => {
        if (!controls) return
        const dir = camera.position.clone().sub(controls.target).normalize()
        animateTo(point.clone().addScaledVector(dir, distance), point.clone(), 0.8)
      },
    }
  }, [apiRef, reset, controls, camera, animateTo])

  useFrame((_, delta) => {
    const a = anim.current
    if (!a || !controls) return
    a.t = Math.min(1, a.t + delta / a.duration)
    const k = ease(a.t)
    camera.position.lerpVectors(a.fromPos, a.toPos, k)
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k)
    controls.update()
    if (a.t >= 1) anim.current = null
    invalidate()
  })

  return null
}

export interface BouquetViewerProps {
  design: BouquetDesign
  selectedGroupId?: string | null
  onSelectGroup?: (groupId: string) => void
  autoRotate?: boolean
  className?: string
  /** Buket büyüyüp küçülünce kamerayı uyarla (stüdyoda açık). */
  fitOnLayoutChange?: boolean
  onLayout?: (layout: BouquetLayout) => void
}

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export const BouquetViewer = forwardRef<ViewerHandle, BouquetViewerProps>(function BouquetViewer(
  { design, selectedGroupId, onSelectGroup, autoRotate = false, className, fitOnLayoutChange = true, onLayout },
  ref,
) {
  const apiRef = useRef<RigApi | null>(null)
  const lk = layoutKey(design)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => computeLayout(design), [lk])
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const [contextLost, setContextLost] = useState(false)

  useImperativeHandle(ref, () => ({
    resetView: () => apiRef.current?.reset(),
    zoom: (f) => apiRef.current?.zoom(f),
    focusGroup: (groupId) => {
      const stems = layoutRef.current.stems.filter((s) => s.groupId === groupId)
      if (!stems.length) return
      const c = new Vector3()
      for (const s of stems) c.add(s.head)
      c.divideScalar(stems.length)
      const nearest = stems.reduce((best, s) => (s.head.distanceTo(c) < best.head.distanceTo(c) ? s : best), stems[0])
      const point = nearest.head.clone().addScaledVector(nearest.dir, 1.5 * nearest.scale)
      apiRef.current?.focus(point, 20 + nearest.scale * 8)
    },
  }))

  const shadowVersion = lk + design.packaging.wrapShape + design.packaging.wrapMaterial + design.packaging.ribbonStyle + design.packaging.bow

  if (contextLost) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft">
          3D görüntü bir an durdu. Sayfayı yenilemen yeterli.
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ touchAction: 'none' }}>
      <Canvas
        shadows="percentage"
        frameloop="demand"
        dpr={[1, isTouch ? 1.75 : 2]}
        camera={{ fov: 32, near: 1, far: 900, position: [0, 30, 120] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping
          gl.toneMappingExposure = 1.02
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setContextLost(true)
          })
        }}
        style={{ touchAction: 'none' }}
        aria-label="Buketin 3D görünümü. Döndürmek için sürükle, yakınlaştırmak için iki parmakla sıkıştır."
        role="img"
      >
        <StudioLights shadowSize={isTouch ? 1024 : 2048} />
        <BouquetModel design={design} layout={layout} selectedGroupId={selectedGroupId} onSelectGroup={onSelectGroup} onLayout={onLayout} />
        <GroundShadow layout={layout} version={shadowVersion} resolution={isTouch ? 256 : 512} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.09}
          rotateSpeed={0.75}
          zoomSpeed={0.8}
          minDistance={14}
          maxDistance={260}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI * 0.64}
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
        />
        <CameraRig layout={layout} apiRef={apiRef} fitOnLayoutChange={fitOnLayoutChange} />
      </Canvas>
    </div>
  )
})
