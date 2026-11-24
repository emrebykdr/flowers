import { PerspectiveCamera, Vector3 } from 'three'
import type { BouquetLayout } from './layout'
import { DEG } from './math'

export interface CameraPose {
  position: Vector3
  target: Vector3
}

/** Buketin tamamını kadraja alan kamera konumu (3/4 açıdan, hafif yukarıdan). */
export function fitPose(layout: BouquetLayout, camera: PerspectiveCamera, aspect: number, opts: { azimuth?: number; elevation?: number; margin?: number } = {}): CameraPose {
  const target = layout.center.clone()
  const vfov = camera.fov * DEG
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  const fov = Math.min(vfov, hfov)
  const radius = layout.extent * (opts.margin ?? 1.06)
  const distance = radius / Math.sin(fov / 2)
  const az = (opts.azimuth ?? 22) * DEG
  const el = (opts.elevation ?? 14) * DEG
  const position = new Vector3(
    target.x + Math.sin(az) * Math.cos(el) * distance,
    target.y + Math.sin(el) * distance,
    target.z + Math.cos(az) * Math.cos(el) * distance,
  )
  return { position, target }
}
