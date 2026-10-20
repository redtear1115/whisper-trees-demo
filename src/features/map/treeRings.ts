// 點地圖上的樹之後的「拉近畫面」：哪些圈能用、距離提示、底部的按鈕，全是純函式。
// 「範圍內」的判斷和打卡共用 checkinRadius（經 ringRadius）：圈內才能掃樹牌打卡；打卡之後才能摸摸樹、回報、留言。

import type { LngLat } from '../../lib/geo'
import { distanceMeters } from '../../lib/geo'
import { ringRadius } from './ring'
import type { Anchor } from './useAnchor'

/** 點樹後鏡頭的目標（拉近畫面蓋在上面；看路線、關掉之後回到這裡）。縮放、俯角集中在這裡 */
export const TREE_FOCUS = {
  zoom: 20.5,
  pitch: 60,
  /** 樹在畫面中心上方多少（占畫面高度的比例） */
  offsetY: 0.12,
  /** 飛過去、飛回來的時間（毫秒；減少動態時為 0） */
  durationMs: 1100,
}

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

export type FocusActionId = 'touch' | 'report' | 'whisper' | 'info' | 'adopt'

export interface FocusAction {
  id: FocusActionId
  label: string
  /** main：樹冠上的三個大圈（摸摸樹、回報、留言在樹洞）；small：樹的資料、認養 */
  size: 'main' | 'small'
  enabled: boolean
  /** 螢幕閱讀器念的完整說明，灰色的會帶原因 */
  aria: string
  /** 點灰色的圈時顯示的一句（能用的是空字串） */
  why: string
  /** 要去哪（router 路徑）；摸摸樹、認養不換頁，是空字串 */
  to: string
  /** 樹的頁面上的錨點（id，不含 #） */
  hash?: string
}

/** 在範圍內、還沒打卡時，三個互動灰掉的原因：掃樹牌是每棵樹預設的互動，打卡之後才打開其他的 */
export const SCAN_FIRST_NOTE = '先掃樹牌打卡，就能摸摸它、回報、留話'
export const ADOPT_NOTE = '認養即將開放'

/**
 * 拉近畫面的圈（2026-10-21 使用者決定，依「拉近的介面」設計圖）。順序固定。
 * 三個互動（摸摸樹、回報、留言在樹洞）要先在這棵樹打卡（30 分鐘內，和樹的頁面一樣，見 recentCheckin）才能用；
 * 還沒打卡：在範圍內說「先掃樹牌」，範圍外說「走近一點」。樹的資料永遠能用；認養永遠是灰的（即將開放）。
 */
export function focusActions(treeId: string, range: RangeInfo, checkedIn: boolean): FocusAction[] {
  const why = checkedIn ? '' : range.inRange ? SCAN_FIRST_NOTE : farNote(range)
  const main = (a: Pick<FocusAction, 'id' | 'label' | 'to' | 'hash'>, desc: string): FocusAction => ({
    ...a,
    size: 'main',
    enabled: checkedIn,
    why,
    aria: checkedIn ? desc : `${desc}（暫時不能用：${why}）`,
  })
  return [
    main({ id: 'touch', label: '摸摸樹', to: '' }, '摸摸樹：呼吸、冥想或擁抱'),
    main({ id: 'report', label: '回報', to: `/tree/${treeId}`, hash: 'report' }, '樹況回報'),
    main({ id: 'whisper', label: '留言在樹洞', to: `/tree/${treeId}`, hash: 'whisper' }, '樹洞：對這棵樹說一句話'),
    { id: 'info', label: '樹的資料', size: 'small', enabled: true, why: '', aria: '樹的資料', to: `/tree/${treeId}` },
    { id: 'adopt', label: '認養', size: 'small', enabled: false, why: ADOPT_NOTE, aria: `認養（${ADOPT_NOTE}）`, to: '' },
  ]
}

/**
 * 拉近畫面底部「返回」旁邊的按鈕：範圍內還沒打卡是「掃樹牌」（打卡仍然是樹牌 QR + GPS）；
 * 範圍外是「怎麼走」（有位置才有），Demo 再加「走過去」；走近之後這兩顆拿掉。打卡過了就只剩「返回」。
 */
export function focusButtons(range: RangeInfo, checkedIn: boolean, demo: boolean): { scan: boolean; route: boolean; walk: boolean } {
  if (checkedIn) return { scan: false, route: false, walk: false }
  if (range.inRange) return { scan: true, route: false, walk: false }
  return { scan: false, route: range.distance !== null, walk: demo }
}
