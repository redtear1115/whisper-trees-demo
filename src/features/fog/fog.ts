// 迷霧的純邏輯：哪些樹算探索過、清出多大的範圍。畫面見 FogMap.tsx，規格見 docs/specs/09-fog.md。
// 只從「打卡過的樹」推算，不記錄任何 GPS 軌跡。

import { distanceMeters, type LngLat } from '../../lib/geo'
import type { Checkin } from '../../store/types'

export { circleRing } from '../../lib/nearby'

/** 每棵打卡過的樹，周圍幾公尺的霧會散開 */
export const FOG_RADIUS_M = 50

/** 台北市的範圍 [西, 南, 東, 北]（略大於行政區） */
export const TAIPEI_BBOX: [number, number, number, number] = [121.45, 24.96, 121.67, 25.21]

const M_PER_DEG_LAT = 111_320
const mPerDegLon = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)

/** 探索過的樹：打卡成功或遠觀，同一棵只算一次（TreeID 整串比對，-001 之類的後綴要保留） */
export function exploredTreeIds(checkins: readonly Pick<Checkin, 'treeId' | 'result'>[]): string[] {
  const seen = new Set<string>()
  for (const c of checkins) {
    if (c.result === 'success' || c.result === 'farView') seen.add(c.treeId)
  }
  return [...seen]
}

/** 依樹籍編號對應座標；查不到的樹略過，不影響其他樹 */
export function clearedCenters(ids: readonly string[], coords: ReadonlyMap<string, LngLat>): LngLat[] {
  const out: LngLat[] = []
  for (const id of ids) {
    const c = coords.get(id)
    if (c) out.push(c)
  }
  return out
}

/**
 * 清出範圍的聯集面積（平方公里）。
 * 圓和圓會重疊，所以不能直接把圓面積加起來：把每個圓蓋到 cellMeters 的方格上，
 * 數有幾格被蓋到。誤差約 1–2%，顯示成「約 x 平方公里」。
 */
export function unionAreaKm2(centers: readonly LngLat[], radius = FOG_RADIUS_M, cellMeters = 4): number {
  if (!centers.length) return 0
  const [lon0, lat0] = centers[0]
  const kx = mPerDegLon(lat0)
  const cells = new Set<number>()
  const rc = Math.ceil(radius / cellMeters)
  for (const [lon, lat] of centers) {
    const x = (lon - lon0) * kx
    const y = (lat - lat0) * M_PER_DEG_LAT
    const cx = Math.floor(x / cellMeters)
    const cy = Math.floor(y / cellMeters)
    for (let ix = cx - rc; ix <= cx + rc; ix++) {
      const dx = (ix + 0.5) * cellMeters - x
      for (let iy = cy - rc; iy <= cy + rc; iy++) {
        const dy = (iy + 0.5) * cellMeters - y
        if (dx * dx + dy * dy <= radius * radius) cells.add((ix + 32768) * 65536 + (iy + 32768))
      }
    }
  }
  return (cells.size * cellMeters * cellMeters) / 1e6
}

/** 所有清出範圍的外接方框 [西, 南, 東, 北]；沒有圓就回傳 null */
export function clearedBounds(
  centers: readonly LngLat[],
  radius = FOG_RADIUS_M,
): [number, number, number, number] | null {
  if (!centers.length) return null
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const [lon, lat] of centers) {
    const dLon = radius / mPerDegLon(lat)
    const dLat = radius / M_PER_DEG_LAT
    w = Math.min(w, lon - dLon)
    e = Math.max(e, lon + dLon)
    s = Math.min(s, lat - dLat)
    n = Math.max(n, lat + dLat)
  }
  return [w, s, e, n]
}

/** 全部的圓都在這個範圍（公尺）內，就整片一起看 */
export const FOG_FIT_SPAN_M = 3000
/** 圓散得很開時，只看「最密的一帶」：以某一棵樹為中心、這個半徑內的圓 */
export const FOG_CLUSTER_M = 1500
/** 打開時最近可以放大到幾級：單一棵樹的 50 m 圈在手機上要看得出光暈 */
export const FOG_FIT_MAX_ZOOM = 16.5

export interface FogView {
  /** [西, 南, 東, 北] */
  bounds: [number, number, number, number]
  maxZoom: number
  /** true：圓散得很開，只框了最密的一帶（畫面上提供「看全市」） */
  focused: boolean
}

/**
 * 打開探索地圖時看哪裡（沒有圓回傳 null，呼叫端看全市）。
 * 全部的圓在 3 km 內就整片框起來；散得更開時，框「1.5 km 內圓最多的一帶」
 * （並列時取比較晚打卡的，centers 依打卡先後排列），
 * 否則整座城市縮到看不見 50 m 的光暈。
 */
export function fogView(centers: readonly LngLat[]): FogView | null {
  const all = clearedBounds(centers, 0)
  if (!all) return null
  const midLat = (all[1] + all[3]) / 2
  const span = Math.max((all[2] - all[0]) * mPerDegLon(midLat), (all[3] - all[1]) * M_PER_DEG_LAT)
  if (span <= FOG_FIT_SPAN_M) {
    return { bounds: clearedBounds(centers)!, maxZoom: FOG_FIT_MAX_ZOOM, focused: false }
  }
  let best: LngLat[] = []
  for (const a of centers) {
    const group = centers.filter((b) => distanceMeters(a, b) <= FOG_CLUSTER_M)
    if (group.length >= best.length) best = group
  }
  return { bounds: clearedBounds(best)!, maxZoom: FOG_FIT_MAX_ZOOM, focused: true }
}

export interface FogStat {
  count: number
  areaKm2: number
}

export function fogStat(centers: readonly LngLat[]): FogStat {
  return { count: centers.length, areaKm2: unionAreaKm2(centers) }
}

/** 面積顯示：很小的時候不要寫成 0.00 */
export function formatArea(km2: number): string {
  if (km2 <= 0) return '0'
  if (km2 < 0.01) return '不到 0.01'
  return km2.toFixed(2)
}

/** 縮小到看全市時，50 m 不到 1 px 看不見；畫面上的圓至少畫這麼大（只影響顯示，不影響統計） */
export const MIN_CLEAR_PX = 9

export function clearPixelRadius(meterRadius: number, metersPerPixel: number, minPx = MIN_CLEAR_PX): number {
  return Math.max(meterRadius / metersPerPixel, minPx)
}
