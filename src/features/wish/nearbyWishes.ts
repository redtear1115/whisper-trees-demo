// 許願分頁的「附近別人的願」：自己位置附近、不是自己許的願，近到遠。純函式。

import { distanceMeters, type LngLat } from '../../lib/geo'
import type { Wish } from '../../store/types'

/** 附近的範圍：和地圖「附近」模式能移動的範圍一樣（NEAR.radiusMeters） */
export function nearbyWishes(wishes: readonly Wish[], myIds: readonly string[], center: LngLat, radiusMeters: number): { wish: Wish; distance: number }[] {
  return wishes
    .filter((w) => !myIds.includes(w.id))
    .map((wish) => ({ wish, distance: distanceMeters(center, wish.lngLat) }))
    .filter((r) => r.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance || a.wish.id.localeCompare(b.wish.id))
}
