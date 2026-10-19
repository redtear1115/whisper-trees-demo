import { useEffect, useState } from 'react'
import { DEMO } from '../../config'
import type { LngLat } from '../../lib/geo'
import { distanceMeters } from '../../lib/geo'
import { findTree } from '../../lib/trees'
import { isDemoMode } from '../../store'

export interface Anchor {
  lngLat: LngLat
  /** gps：真實定位；demo：Demo 模式；fallback：沒有定位權限或還沒定位到 */
  source: 'gps' | 'demo' | 'fallback'
  accuracy?: number
}

/** 位置移動超過這個距離才更新範圍，避免 GPS 抖動讓地圖一直跳 */
const MIN_MOVE_M = 15
/** 定位誤差變動超過這個值才更新（感應圈半徑跟著誤差變） */
const MIN_ACCURACY_CHANGE_M = 5

/**
 * 「附近」模式的中心：持續追蹤 GPS；Demo 模式或沒有定位時，用東門的示範樹。
 * enabled 為 false 時不追蹤（全市模式不需要一直要定位）。
 */
export function useAnchor(enabled: boolean): Anchor {
  const demo = isDemoMode()
  const [anchor, setAnchor] = useState<Anchor>({ lngLat: DEMO.center, source: demo ? 'demo' : 'fallback' })

  // 示範樹的真實座標
  useEffect(() => {
    let alive = true
    findTree(DEMO.treeId).then((t) => {
      if (alive && t) setAnchor((a) => (a.source === 'gps' ? a : { ...a, lngLat: t.lngLat }))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!enabled || demo || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const next: LngLat = [p.coords.longitude, p.coords.latitude]
        const accuracy = p.coords.accuracy
        setAnchor((a) => {
          if (a.source !== 'gps' || distanceMeters(a.lngLat, next) >= MIN_MOVE_M) return { lngLat: next, source: 'gps', accuracy }
          // 沒走動：位置不變，但誤差變了就更新，感應圈才跟著變
          return Math.abs((a.accuracy ?? 0) - accuracy) >= MIN_ACCURACY_CHANGE_M ? { ...a, accuracy } : a
        })
      },
      () => setAnchor((a) => (a.source === 'gps' ? a : { ...a, source: 'fallback' })),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, demo])

  return anchor
}
