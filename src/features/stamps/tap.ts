// 小東西的點擊輔助：點兩下的判斷、點擊範圍不夠大時要補多少、里列表的排序。

import type { Village } from '../../lib/villages'

/** 兩次點擊算「點兩下」：同一區、間隔不超過 DOUBLE_TAP_MS */
export const DOUBLE_TAP_MS = 350
export function isDoubleTap(prev: { name: string; at: number } | null, name: string, now: number): boolean {
  return !!prev && prev.name === name && now - prev.at <= DOUBLE_TAP_MS
}

/** 手指好點的最小邊長（CSS px） */
export const MIN_TARGET_PX = 44

/**
 * 一個形狀的外框（SVG 單位）換成螢幕上不到 44 px 的，要補一個多大的點擊圈：回傳半徑（SVG 單位）；夠大就回 null。
 * pxPerUnit：1 個 SVG 單位約幾個螢幕像素。
 */
export function tapPadRadius(bounds: readonly [number, number, number, number], pxPerUnit: number): number | null {
  const w = (bounds[2] - bounds[0]) * pxPerUnit
  const h = (bounds[3] - bounds[1]) * pxPerUnit
  if (Math.min(w, h) >= MIN_TARGET_PX) return null
  return MIN_TARGET_PX / 2 / pxPerUnit
}

export interface VillageRow {
  village: Village
  lit: number
}

/** 里列表：點亮多的在前，同樣多的依名稱排；沒有樹的里排最後。不改動輸入。 */
export function villageRows(villages: readonly Village[], lit: ReadonlyMap<string, number>): VillageRow[] {
  return villages
    .map((village) => ({ village, lit: lit.get(village.id) ?? 0 }))
    .sort((a, b) => Number(a.village.total === 0) - Number(b.village.total === 0) || b.lit - a.lit || a.village.name.localeCompare(b.village.name, 'zh-Hant'))
}
