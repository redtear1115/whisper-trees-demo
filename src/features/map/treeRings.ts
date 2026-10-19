// 點地圖上的樹之後，樹旁浮出的四個行動圈。哪些能用、距離提示、排成弧形的位置，全是純函式。
// 「能用」的判斷和打卡共用 checkinRadius（經 ringRadius）：圈內才能掃樹牌、留樹洞、回報；樹的資料隨時可以看。

import type { LngLat } from '../../lib/geo'
import { distanceMeters } from '../../lib/geo'
import { ringRadius } from './ring'
import type { Anchor } from './useAnchor'

/** 點樹後鏡頭的目標。縮放、俯角集中在這裡；樹放在畫面中心偏上，下方留給弧形的行動圈 */
export const TREE_FOCUS = {
  zoom: 20.5,
  pitch: 60,
  /** 樹在畫面中心上方多少（占畫面高度的比例） */
  offsetY: 0.12,
  /** 飛過去、飛回來的時間（毫秒；減少動態時為 0） */
  durationMs: 1100,
}

export type RingActionId = 'scan' | 'whisper' | 'info' | 'report' | 'walk'

export interface RangeInfo {
  /** 沒有定位（fallback）時是 null：當作很遠 */
  distance: number | null
  inRange: boolean
  /** 還要走多少公尺才進得了感應圈（無條件進位，至少 1）；不在圈外或沒有定位時是 null */
  remaining: number | null
}

/** 人物（Demo 示範位置或 GPS）到樹的距離，和是否在打卡的感應圈內 */
export function rangeInfo(anchor: Pick<Anchor, 'lngLat' | 'source' | 'accuracy'>, tree: LngLat): RangeInfo {
  const radius = ringRadius(anchor)
  if (radius === null) return { distance: null, inRange: false, remaining: null }
  const distance = distanceMeters(anchor.lngLat, tree)
  if (distance <= radius) return { distance, inRange: true, remaining: null }
  return { distance, inRange: false, remaining: Math.max(1, Math.ceil(distance - radius)) }
}

/** 點了灰色的圈時顯示的提醒（平靜的語氣，不責備） */
export function farNote(range: RangeInfo): string {
  if (range.inRange) return ''
  if (range.remaining === null) return '還沒有你的位置，走到樹旁邊就能用'
  return `走近一點，還有約 ${range.remaining} 公尺`
}

export interface RingAction {
  id: RingActionId
  label: string
  /** src/assets.ts 的素材 id */
  art: string
  enabled: boolean
  /** 螢幕閱讀器念的完整說明，灰色的會帶原因 */
  aria: string
  /** 要去哪（router 路徑）；「走過去」不換頁，是空字串 */
  to: string
  /** 樹的頁面上的錨點（id，不含 #） */
  hash?: string
  /** 只有掃樹牌帶：告訴掃描頁是為哪一棵樹來的 */
  hintTreeId?: string
}

/**
 * 四個行動，順序固定（左到右）。圈外只有「樹的資料」能用。
 * Demo 模式（demo = true）多第 5 個「走過去」：把模擬位置移到樹旁，永遠能用（MapPage 處理）。
 */
export function ringActions(treeId: string, range: RangeInfo, demo = false): RingAction[] {
  const near = range.inRange
  const why = farNote(range)
  const make = (a: Omit<RingAction, 'enabled' | 'aria'>, needsNear: boolean, desc: string): RingAction => {
    const enabled = !needsNear || near
    return { ...a, enabled, aria: enabled ? desc : `${desc}（暫時不能用：${why}）` }
  }
  const actions = [
    make({ id: 'scan', label: '掃樹牌', art: 'action-scan', to: '/scan', hintTreeId: treeId }, true, '掃樹牌打卡'),
    make({ id: 'whisper', label: '樹洞', art: 'action-whisper', to: `/tree/${treeId}`, hash: 'whisper' }, true, '樹洞：對這棵樹說一句話'),
    make({ id: 'info', label: '樹的資料', art: 'action-info', to: `/tree/${treeId}` }, false, '樹的資料'),
    make({ id: 'report', label: '樹況回報', art: 'action-report', to: `/tree/${treeId}`, hash: 'report' }, true, '樹況回報'),
  ]
  if (demo) actions.push(make({ id: 'walk', label: '走過去', art: 'action-walk', to: '' }, false, 'Demo：走到這棵樹旁邊'))
  return actions
}

export interface Offset {
  x: number
  y: number
}

/**
 * 在樹的下方排成一道弧：count 個圈、半徑 radius（px），整道弧張開 spanDeg 度（4 個圈 140°，5 個圈 170° 才不擠），正下方為中間。
 * 回傳相對樹中心的位置（x 向右、y 向下），由左到右。
 */
export function arcOffsets(count: number, radius: number, spanDeg = count > 4 ? 170 : 140): Offset[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: radius }]
  return Array.from({ length: count }, (_, i) => {
    const deg = -spanDeg / 2 + (spanDeg * i) / (count - 1)
    const rad = (deg * Math.PI) / 180
    return { x: Math.round(radius * Math.sin(rad) * 10) / 10, y: Math.round(radius * Math.cos(rad) * 10) / 10 }
  })
}
