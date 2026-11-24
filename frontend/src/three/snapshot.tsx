import { createRoot, extend, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { NeutralToneMapping, OrthographicCamera, PerspectiveCamera, type WebGLRenderer } from 'three'
import { FLOWERS } from '../domain/catalog'
import type { BouquetDesign, FlowerType } from '../domain/types'
import { BouquetModel } from './BouquetModel'
import { fitPose } from './camera'
import { getHeadModel } from './flowers'
import { computeLayout, type BouquetLayout } from './layout'
import { createPetalMaterial, fixedMaterial } from './materials'
import { GroundShadow, StudioLights } from './SceneSetup'

// <Canvas> dışında createRoot kullanıldığı için THREE nesneleri JSX'e elle tanıtılır.
extend(THREE as unknown as Parameters<typeof extend>[0])

const BACKGROUND = '#f3ece3'

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()))
}

function Capture({ onReady }: { onReady: (gl: WebGLRenderer) => void }) {
  const gl = useThree((s) => s.gl)
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await nextFrame()
      if (cancelled) return
      gl.shadowMap.needsUpdate = true
      const now = performance.now()
      for (let i = 0; i < 3; i++) advance(now + i * 16, true)
      onReady(gl)
    })()
    return () => {
      cancelled = true
    }
  }, [gl, advance, onReady])
  return null
}

function PoseCamera({ layout }: { layout: BouquetLayout }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  useEffect(() => {
    const pose = fitPose(layout, camera, size.width / size.height, { azimuth: 24, elevation: 16, margin: 1.02 })
    camera.position.copy(pose.position)
    camera.lookAt(pose.target)
    camera.updateProjectionMatrix()
  }, [layout, camera, size])
  return null
}

async function withOffscreenRoot<T>(
  width: number,
  height: number,
  alpha: boolean,
  orthographic: boolean,
  render: (done: (gl: WebGLRenderer) => void) => React.ReactNode,
  read: (canvas: HTMLCanvasElement) => Promise<T>,
): Promise<T> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const root = createRoot(canvas)
  try {
    await root.configure({
      size: { width, height, top: 0, left: 0 },
      dpr: 1,
      frameloop: 'never',
      shadows: 'percentage',
      orthographic,
      events: undefined,
      gl: { antialias: true, preserveDrawingBuffer: true, alpha },
      camera: orthographic
        ? { near: 0.1, far: 500, position: [0, 0, 100] }
        : { fov: 30, near: 1, far: 900, position: [0, 30, 120] },
      onCreated: ({ gl }) => {
        gl.toneMapping = NeutralToneMapping
        gl.toneMappingExposure = 1.02
        if (alpha) gl.setClearColor(0x000000, 0)
      },
    })
    const gl = await new Promise<WebGLRenderer>((resolve) => {
      root.render(render(resolve))
    })
    const result = await read(gl.domElement)
    return result
  } finally {
    root.unmount()
    // Sahibi R3F; yine de bağlamı hemen bırakalım (iOS bağlam sayısını sınırlar)
    setTimeout(() => {
      const ctx = canvas.getContext('webgl2')
      if (ctx && !ctx.isContextLost()) ctx.getExtension('WEBGL_lose_context')?.loseContext()
    }, 0)
  }
}

/** Buketin kaydedilen önizleme görseli (JPEG, 4:5). Ekrandaki görüntüleyiciden bağımsız. */
export async function renderBouquetPreview(design: BouquetDesign, width = 720, height = 900): Promise<Blob> {
  const layout = computeLayout(design)
  // alpha: drei ContactShadows gölge dokusunu temizlerken çizicinin şeffaf temizleme rengine güvenir.
  return withOffscreenRoot(
    width,
    height,
    true,
    false,
    (done) => (
      <>
        <color attach="background" args={[BACKGROUND]} />
        <StudioLights shadowSize={2048} />
        <BouquetModel design={design} layout={layout} />
        <GroundShadow layout={layout} version="snapshot" resolution={512} />
        <PoseCamera layout={layout} />
        <Capture onReady={done} />
      </>
    ),
    (canvas) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Önizleme oluşturulamadı.'))), 'image/jpeg', 0.88),
      ),
  )
}

// ---------------------------------------------------------------------------
// Katalog küçük resimleri: 12 çiçek tek karede çizilir, sonra parçalara bölünür.
// ---------------------------------------------------------------------------

const COLS = 4
const ROWS = 3
const CELL = 220
let thumbPromise: Promise<Record<FlowerType, string>> | null = null
const STORAGE_KEY = 'ourbloom:thumbs:v3'

function ThumbnailGrid() {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const mats = useMemo(
    () => FLOWERS.map((f) => ({ petal: createPetalMaterial(f.defaultColor), petal2: createPetalMaterial('#c95d8e') })),
    [],
  )
  useEffect(
    () => () => {
      for (const m of mats) {
        m.petal.dispose()
        m.petal2.dispose()
      }
    },
    [mats],
  )
  useEffect(() => {
    camera.left = -COLS * 5
    camera.right = COLS * 5
    camera.top = ROWS * 5
    camera.bottom = -ROWS * 5
    camera.position.set(0, 0, 100)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  return (
    <group>
      {FLOWERS.map((f, i) => {
        const model = getHeadModel(f.type, 0)
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = (col - (COLS - 1) / 2) * 10
        const y = ((ROWS - 1) / 2 - row) * 10
        const extent = Math.max(model.radius * 2, model.height * 1.1)
        const scale = 7.4 / extent
        const tall = model.height > model.radius * 1.6
        const { petal, petal2 } = mats[i]
        return (
          <group key={f.type} position={[x, y - (tall ? 3.4 : 1.6), 0]} rotation={[tall ? 0.25 : 0.85, 0.5, 0]} scale={scale}>
            {model.parts.map((p, k) => (
              <mesh key={k} geometry={p.geometry} material={p.kind === 'petal' ? petal : p.kind === 'petal2' ? petal2 : fixedMaterial()} />
            ))}
          </group>
        )
      })}
    </group>
  )
}

export function getFlowerThumbnails(): Promise<Record<FlowerType, string>> {
  if (thumbPromise) return thumbPromise
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<FlowerType, string>
      if (Object.keys(parsed).length === FLOWERS.length) {
        thumbPromise = Promise.resolve(parsed)
        return thumbPromise
      }
    }
  } catch {
    // önbellek yoksa çiz
  }
  thumbPromise = withOffscreenRoot(
    COLS * CELL,
    ROWS * CELL,
    true,
    true,
    (done) => (
      <>
        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#fffaf2', '#e3d5c4', 0.9]} />
        <directionalLight position={[10, 20, 30]} intensity={2.2} />
        <directionalLight position={[-20, 5, 10]} intensity={0.6} />
        <ThumbnailGrid />
        <Capture onReady={done} />
      </>
    ),
    async (canvas) => {
      const out = {} as Record<FlowerType, string>
      const cell = document.createElement('canvas')
      cell.width = CELL
      cell.height = CELL
      const ctx = cell.getContext('2d')!
      FLOWERS.forEach((f, i) => {
        ctx.clearRect(0, 0, CELL, CELL)
        ctx.drawImage(canvas, (i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL, CELL, 0, 0, CELL, CELL)
        out[f.type] = cell.toDataURL('image/png')
      })
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out))
      } catch {
        // depolama dolu ya da kapalı: sorun değil
      }
      return out
    },
  ).catch((err) => {
    thumbPromise = null
    throw err
  })
  return thumbPromise
}

