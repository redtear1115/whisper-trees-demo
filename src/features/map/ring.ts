// 「附近」模式的人物感應圈：半徑和打卡判斷共用 checkinRadius，兩邊不會不一致。

import { CHECKIN } from '../../config'
import type { LngLat } from '../../lib/geo'
import { checkinRadius, distanceMeters } from '../../lib/geo'
import type { Anchor } from './useAnchor'

/** 感應圈半徑（公尺）；沒有定位（fallback）時不畫圈，回傳 null */
export function ringRadius(anchor: Pick<Anchor, 'source' | 'accuracy'>): number | null {
  if (anchor.source === 'fallback') return null
  const accuracy = anchor.source === 'demo' ? CHECKIN.demoAccuracy : (anchor.accuracy ?? 0)
  return checkinRadius(accuracy)
}

/** 圈內的樹（以樹籍編號去重：同一棵樹可能出現在相鄰的兩塊圖磚） */
export function treesInRing(
  features: { id: string; lngLat: LngLat }[],
  center: LngLat,
  radius: number,
): { id: string; lngLat: LngLat }[] {
  const seen = new Set<string>()
  const out: { id: string; lngLat: LngLat }[] = []
  for (const f of features) {
    if (seen.has(f.id) || distanceMeters(center, f.lngLat) > radius) continue
    seen.add(f.id)
    out.push(f)
  }
  return out
}
