// Demo 模式（?demo=1）的模擬位置：打卡判斷與地圖共用。位置存在 store（sessionStorage），預設站在示範樹的位置。

import { CHECKIN, DEMO } from '../config'
import { getDemoPosition } from '../store'
import type { LngLat, Position } from './geo'
import { findTree } from './trees'

/** 模擬位置 + Demo 的定位誤差；和 GPS 的 Position 同一個形狀 */
export function demoPositionAt(lngLat: LngLat): Position {
  return { lngLat, accuracy: CHECKIN.demoAccuracy }
}

/** 目前的模擬位置：拖曳過就是拖曳的位置，否則站在示範樹旁（資料還沒載入時用 DEMO.center） */
export async function currentDemoPosition(): Promise<Position> {
  const stored = getDemoPosition()
  if (stored) return demoPositionAt(stored)
  const tree = await findTree(DEMO.treeId)
  return demoPositionAt(tree?.lngLat ?? DEMO.center)
}
