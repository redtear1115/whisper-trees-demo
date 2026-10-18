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

/** 依距離判斷打卡結果，規則見 docs/specs/03-checkin.md */
export function judgeCheckin(
  tree: LngLat,
  remark: string,
  position: Position | null,
): CheckinResult {
  if (!position) return { kind: 'noLocation' }
  const d = distanceMeters(tree, position.lngLat)
  const limit = CHECKIN.nearMeters + Math.min(position.accuracy, CHECKIN.maxAccuracyBonus)
  if (d <= limit) return { kind: 'success', distance: d }
  if (isMedianStrip(remark) && d <= CHECKIN.farViewMeters) return { kind: 'farView', distance: d }
  return { kind: 'tooFar', distance: d }
}
