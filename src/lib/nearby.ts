// 「附近」模式的範圍計算：以目前位置為中心、半徑 N 公尺。

import type { LngLat } from './geo'

const M_PER_DEG_LAT = 111_320

function mPerDegLon(lat: number) {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
}

/** 以 center 為中心、半徑 meters 的外接方框 [[西, 南], [東, 北]] */
export function boundsAround([lon, lat]: LngLat, meters: number): [LngLat, LngLat] {
  const dLat = meters / M_PER_DEG_LAT
  const dLon = meters / mPerDegLon(lat)
  return [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat + dLat],
  ]
}

/** 圓形的多邊形（GeoJSON 座標，首尾相同） */
export function circleRing([lon, lat]: LngLat, meters: number, steps = 64): LngLat[] {
  const ring: LngLat[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    ring.push([lon + (Math.cos(a) * meters) / mPerDegLon(lat), lat + (Math.sin(a) * meters) / M_PER_DEG_LAT])
  }
  return ring
}
