import { CHECKIN } from '../config'

export type LngLat = [number, number]

/** 兩點的地表距離（公尺） */
export function distanceMeters([lon1, lat1]: LngLat, [lon2, lat2]: LngLat): number {
  const R = 6_371_000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** 從某點往北移動 meters 公尺 */
export function offsetNorth([lon, lat]: LngLat, meters: number): LngLat {
  return [lon, lat + meters / 111_320]
}

/**
 * Demo 的「走過去」：站到樹旁 offsetMeters 公尺，從目前位置往樹的方向看過去那一側（人是從那邊走來的）。
 * 已經在 offsetMeters 以內就留在原地；人和樹在同一點時也不動（沒有方向可言）。
 */
export function walkTarget(from: LngLat, tree: LngLat, offsetMeters: number = CHECKIN.demoOffsetMeters): LngLat {
  const d = distanceMeters(from, tree)
  if (d <= offsetMeters) return from
  const t = offsetMeters / d // 沿著 tree → from 的連線，離樹 offsetMeters（短距離，經緯度線性內插即可）
  return [tree[0] + (from[0] - tree[0]) * t, tree[1] + (from[1] - tree[1]) * t]
}

export type CheckinResult =
  | { kind: 'success'; distance: number }
  | { kind: 'farView'; distance: number }
  | { kind: 'tooFar'; distance: number }
  | { kind: 'noLocation' }

export interface Position {
  lngLat: LngLat
  accuracy: number
}

export function isMedianStrip(remark: string): boolean {
  return remark.includes('安全島')
}

/** 打卡的感應半徑（公尺）：nearMeters + min(定位誤差, maxAccuracyBonus)。打卡判斷與地圖上的感應圈共用，不會不一致。 */
export function checkinRadius(accuracy: number): number {
  return CHECKIN.nearMeters + Math.min(Math.max(accuracy, 0), CHECKIN.maxAccuracyBonus)
}

/** 依距離判斷打卡結果，規則見 docs/specs/03-checkin.md */
export function judgeCheckin(
  tree: LngLat,
  remark: string,
  position: Position | null,
): CheckinResult {
  if (!position) return { kind: 'noLocation' }
  const d = distanceMeters(tree, position.lngLat)
  if (d <= checkinRadius(position.accuracy)) return { kind: 'success', distance: d }
  if (isMedianStrip(remark) && d <= CHECKIN.farViewMeters) return { kind: 'farView', distance: d }
  return { kind: 'tooFar', distance: d }
}
