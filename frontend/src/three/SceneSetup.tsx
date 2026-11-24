import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import type { BouquetLayout } from './layout'

/** Yumuşak stüdyo ışığı: HDR dosyası indirmeden, ışık panelleriyle ortam haritası. */
export function StudioLights({ shadowSize = 1024 }: { shadowSize?: number }) {
  return (
    <>
      <hemisphereLight args={['#fffaf2', '#e3d5c4', 0.85]} />
      <directionalLight
        position={[22, 50, 32]}
        intensity={2.2}
        color="#fff3e6"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={48}
        shadow-camera-bottom={-36}
      />
      <directionalLight position={[-34, 20, -26]} intensity={0.55} color="#eef1ff" />
      <directionalLight position={[0, 8, 40]} intensity={0.35} color="#fff8f2" />
      <Environment resolution={128} frames={1} environmentIntensity={0.75}>
        <Lightformer form="rect" intensity={1.6} position={[0, 5, 6]} scale={[10, 6, 1]} color="#fff6ec" />
        <Lightformer form="rect" intensity={0.8} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[6, 8, 1]} color="#f2f0ff" />
        <Lightformer form="circle" intensity={1.2} position={[0, 8, -4]} scale={4} color="#ffffff" />
        <Lightformer form="rect" intensity={0.45} position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#efe2d4" />
      </Environment>
    </>
  )
}

/**
 * Zemindeki yumuşak gölge. Kamera dönerken yeniden çizilmez; buket değişince
 * kısa bir beklemeden sonra bir kez yeniden hesaplanır.
 */
export function GroundShadow({ layout, version, resolution = 512 }: { layout: BouquetLayout; version: string; resolution?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  const [key, setKey] = useState(version)
  useEffect(() => {
    const t = window.setTimeout(() => setKey(version), 180)
    return () => window.clearTimeout(t)
  }, [version])
  useEffect(() => {
    invalidate()
  }, [key, invalidate])
  return (
    <ContactShadows
      key={key}
      frames={1}
      position={[0, layout.bottomY - 0.4, 0]}
      scale={Math.max(70, layout.extent * 3.2)}
      far={layout.topY - layout.bottomY + 8}
      blur={2.6}
      opacity={0.38}
      resolution={resolution}
      color="#4a3a30"
    />
  )
}
