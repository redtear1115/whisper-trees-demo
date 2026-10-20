// 里地圖：把經緯度投影到某區範圍的 SVG 畫布（保持長寬比），並算里名的位置、判斷放不放得下名字。

import type { LngLat } from '../../lib/geo'
import type { Ring, Village } from '../../lib/villages'
import { largestRing, ringCentroid, type Pt } from './svgPath'

export interface Projection {
  /** 畫布寬高（SVG 單位） */
  width: number
  height: number
  project: (p: LngLat) => Pt
}

export type BBox = [number, number, number, number]

export function unionBBox(boxes: readonly BBox[]): BBox | null {
  if (!boxes.length) return null
  return boxes.reduce<BBox>((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [...boxes[0]])
}

/**
 * 等距圓柱投影（經度乘 cos(緯度) 校正），放進 width × H 的畫布並置中；
 * H 依範圍的長寬比決定，夾在 [minH, maxH]。範圍退化（寬或高為 0）不會除以零。
 */
export function fitProjection(bbox: BBox, width = 360, pad = 14, minH = 240, maxH = 440): Projection {
  const [minX, minY, maxX, maxY] = bbox
  const cosLat = Math.cos((((minY + maxY) / 2) * Math.PI) / 180)
  const w = Math.max((maxX - minX) * cosLat, 1e-9)
  const h = Math.max(maxY - minY, 1e-9)
  const height = Math.round(Math.min(maxH, Math.max(minH, ((width - 2 * pad) * h) / w + 2 * pad)))
  const scale = Math.min((width - 2 * pad) / w, (height - 2 * pad) / h)
  const ox = (width - w * scale) / 2
  const oy = (height - h * scale) / 2
  return {
    width,
    height,
    project: ([lng, lat]) => [ox + (lng - minX) * cosLat * scale, oy + (maxY - lat) * scale],
  }
}

function ringPath(ring: Pt[]): string {
  return ring.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z'
}

function polygons(v: Village): Ring[][] {
  return v.geometry.type === 'Polygon' ? [v.geometry.coordinates] : v.geometry.coordinates
}

/** 投影後的所有環（含洞），給畫路徑用 */
export function projectedRings(v: Village, proj: Projection): Pt[][] {
  return polygons(v).flatMap((poly) => poly.map((ring) => ring.map((p) => proj.project(p as LngLat))))
}

/** 里的 SVG 路徑（evenodd 填色，洞會挖空） */
export function villagePath(v: Village, proj: Projection): string {
  return projectedRings(v, proj).map(ringPath).join('')
}

export interface VillageLabel {
  x: number
  y: number
  /** 最大一塊的外框寬高（SVG 單位） */
  w: number
  h: number
}

/** 最大一塊外環的重心與外框（洞不算） */
export function villageLabel(v: Village, proj: Projection): VillageLabel | null {
  const outers = polygons(v).map((poly) => poly[0]?.map((p) => proj.project(p as LngLat)) ?? [])
  const ring = largestRing(outers.filter((r) => r.length))
  if (!ring) return null
  const [x, y] = ringCentroid(ring)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  return { x, y, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

/** 名字放得下嗎：外框寬容得下整個名字（字寬約等於字級），高容得下一行 */
export function labelFits(name: string, label: VillageLabel | null, fontSize: number): boolean {
  if (!label) return false
  return label.w >= [...name].length * fontSize * 1.05 && label.h >= fontSize * 1.6
}

/**
 * 里名要不要畫在地圖上：放得下才畫；放不下就不畫，**不縮小字級、也不因為點亮過而硬畫**
 * （第五輪，使用者決定：縮到 10 px 以下讀不到，名字改由旁邊的里列表負責）。`fontSize` 是 SVG 單位，
 * 呼叫的人用 12 CSS px ÷ 每單位的螢幕像素換算，所以放不下的判斷就是「在畫面上放不放得下 12 px 的字」。
 */
export function villageNameMode(name: string, label: VillageLabel | null, fontSize: number): boolean {
  return labelFits(name, label, fontSize)
}
