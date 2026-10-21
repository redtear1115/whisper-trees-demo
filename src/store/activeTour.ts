// 進行中的里路線：集章冊按「開始」後，大地圖畫出這條路線；只存在這個瀏覽器分頁（sessionStorage），
// 換頁、重新整理還在，按「結束」或關掉分頁就沒了。不進 localStorage 與雲端：它只是這次散步的計畫。

import { useMemo, useSyncExternalStore } from 'react'
import type { LngLat } from '../lib/geo'

export interface ActiveTourStop {
  id: string
  lngLat: LngLat
}

export interface ActiveTour {
  /** 里名，例如「光明里」 */
  village: string
  /** 行政區名，例如「大安區」 */
  district: string
  start: LngLat
  stops: ActiveTourStop[]
  /** 沿路的整條路線座標 */
  path: LngLat[]
  meters: number
  minutes: number
  /** 按「開始」的時間（ms）；這之後打卡的停靠樹算走過 */
  startedAt: number
}

const KEY = 'whisper-trees:active-tour'
const listeners = new Set<() => void>()

const isLngLat = (v: unknown): v is LngLat =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

/** 讀回存的字串；格式不對（或沒有任何停靠樹）回傳 null */
export function parseActiveTour(raw: string | null): ActiveTour | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const { village, district, start, stops, path, meters, minutes, startedAt } = o
    if (typeof village !== 'string' || typeof district !== 'string') return null
    if (!isLngLat(start) || !Array.isArray(path) || !path.every(isLngLat)) return null
    if (typeof meters !== 'number' || typeof minutes !== 'number' || typeof startedAt !== 'number') return null
    if (!Number.isFinite(meters) || !Number.isFinite(minutes) || !Number.isFinite(startedAt)) return null
    if (!Array.isArray(stops) || stops.length === 0) return null
    const ok = stops.every((s) => !!s && typeof (s as ActiveTourStop).id === 'string' && isLngLat((s as ActiveTourStop).lngLat))
    if (!ok) return null
    return {
      village,
      district,
      start,
      stops: (stops as ActiveTourStop[]).map((s) => ({ id: s.id, lngLat: s.lngLat })),
      path: path as LngLat[],
      meters,
      minutes,
      startedAt,
    }
  } catch {
    return null
  }
}

function raw(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function getActiveTour(): ActiveTour | null {
  return parseActiveTour(raw())
}

export function setActiveTour(tour: ActiveTour) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(tour))
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function clearActiveTour() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

/** 進行中的路線；地圖跟著它更新 */
export function useActiveTour(): ActiveTour | null {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    raw,
  )
  return useMemo(() => parseActiveTour(s), [s])
}
