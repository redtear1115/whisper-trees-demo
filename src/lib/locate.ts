import { CHECKIN } from '../config'
import type { Position } from './geo'

/** 取得目前位置；使用者拒絕或逾時回傳 null。 */
export function locate(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lngLat: [p.coords.longitude, p.coords.latitude], accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: CHECKIN.geoTimeoutMs, maximumAge: 5_000 },
    )
  })
}
