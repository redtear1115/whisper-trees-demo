// 大地圖上的里路線（集章冊「開始」之後）：哪些停靠樹走過了、頂端列的文字、鏡頭可以移動的範圍、畫線的資料。
// 全是純函式，規格見 docs/specs/02-map.md「里路線」與 docs/specs/08-extensions.md §10。

import type { LngLat } from '../../lib/geo'
import { boundsAround } from '../../lib/nearby'
import type { ActiveTour } from '../../store'
import type { Checkin } from '../../store/types'
import { distanceLabel } from '../stamps/villageTrees'

/** 按「開始」之後打卡過（成功或遠觀）的停靠樹；整串 TreeID 比對 */
export function doneStopIds(tour: ActiveTour, checkins: readonly Checkin[]): Set<string> {
  const stops = new Set(tour.stops.map((s) => s.id))
  const done = new Set<string>()
  for (const c of checkins) {
    if (c.at >= tour.startedAt && stops.has(c.treeId)) done.add(c.treeId)
  }
  return done
}

/** 頂端列的文字：「光明里路線・已點亮 2／8 棵・約 340 公尺」；全部走完是「這條路線走完了！」 */
export function tourBarText(tour: ActiveTour, done: number): string {
  if (done >= tour.stops.length) return '這條路線走完了！'
  return `${tour.village}路線・已點亮 ${done}／${tour.stops.length} 棵・約 ${distanceLabel(tour.meters)}`
}

export type Bounds = [LngLat, LngLat]

/** 路線涵蓋的範圍（起點、整條路線、停靠樹），往四周加 margin 公尺 */
export function tourBounds(tour: ActiveTour, marginMeters = 0): Bounds {
  let minLng = tour.start[0]
  let maxLng = minLng
  let minLat = tour.start[1]
  let maxLat = minLat
  for (const [lng, lat] of [...tour.path, ...tour.stops.map((s) => s.lngLat)]) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  if (!marginMeters) return [[minLng, minLat], [maxLng, maxLat]]
  const mid: LngLat = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  const pad = boundsAround(mid, marginMeters)
  const dLng = pad[1][0] - mid[0]
  const dLat = pad[1][1] - mid[1]
  return [[minLng - dLng, minLat - dLat], [maxLng + dLng, maxLat + dLat]]
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return [
    [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])],
    [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])],
  ]
}

/**
 * 附近模式鏡頭可以移動的範圍：人所在處半徑 radiusMeters；有進行中的路線時再把整條路線往外 margin 公尺併進來，
 * 這樣看得到整條路線、走到路線上的任何一棵樹，也不會和「只能在附近移動」互相打架。
 */
export function movableBounds(anchor: LngLat, radiusMeters: number, tour: ActiveTour | null, marginMeters = TOUR_MARGIN_M): Bounds {
  const near = boundsAround(anchor, radiusMeters)
  return tour ? unionBounds(near, tourBounds(tour, marginMeters)) : near
}

export const TOUR_MARGIN_M = 300
/** 有進行中的路線時的最小縮放（長的路線要拉得比街景遠才框得下） */
export const TOUR_MIN_ZOOM = 14

export const EMPTY_LINE = { type: 'FeatureCollection' as const, features: [] }

/** 路線的 GeoJSON（一條線） */
export function tourLine(tour: ActiveTour) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: tour.path } }
}
