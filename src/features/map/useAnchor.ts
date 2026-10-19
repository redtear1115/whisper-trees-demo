import { useEffect, useState } from 'react'
import { DEMO } from '../../config'
import type { LngLat } from '../../lib/geo'
import { distanceMeters } from '../../lib/geo'
import { findTree } from '../../lib/trees'
import { getDemoPosition, isDemoMode, useDemoPosition } from '../../store'

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
 * 「附近」模式的中心：持續追蹤 GPS；Demo 模式用模擬位置（預設在東門的示範樹旁）；沒有定位時用東門的示範樹。
 * enabled 為 false 時不追蹤（全市模式不需要一直要定位）。
 */
export function useAnchor(enabled: boolean): Anchor {
  const demo = isDemoMode()
  // Demo：模擬位置（可以拖曳人物移動，存在 sessionStorage）；沒移動過就站在示範樹旁
  const demoPos = useDemoPosition()
  const [anchor, setAnchor] = useState<Anchor>({ lngLat: (demo && demoPos) || DEMO.center, source: demo ? 'demo' : 'fallback' })

  // 示範樹的真實座標（Demo 已經有模擬位置時不覆蓋）
  useEffect(() => {
    let alive = true
    findTree(DEMO.treeId).then((t) => {
      if (alive && t && !(demo && getDemoPosition())) setAnchor((a) => (a.source === 'gps' ? a : { ...a, lngLat: t.lngLat }))
    })
    return () => {
      alive = false
    }
  }, [demo])

  // Demo：模擬位置一變（拖曳放開、走過去），錨點跟著走
  useEffect(() => {
    if (demo && demoPos) setAnchor((a) => (a.source === 'demo' && a.lngLat.join() === demoPos.join() ? a : { lngLat: demoPos, source: 'demo' }))
  }, [demo, demoPos])

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
