// 點地圖上的樹之後的「拉近畫面」：哪些圈能用、距離提示、底部的按鈕，全是純函式。
// 「範圍內」的判斷和打卡共用 checkinRadius（經 ringRadius）：圈內才能掃樹牌打卡、摸摸樹、留言在樹洞；打卡之後才能回報。

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

export type FocusActionId = 'touch' | 'report' | 'whisper' | 'adopt'

export interface FocusAction {
  id: FocusActionId
  label: string
  /** main：樹冠上的三個大圈（摸摸樹、回報、留言在樹洞）；small：認養 */
  size: 'main' | 'small'
  enabled: boolean
  /** 點了先做什麼：scan＝去掃樹牌（感應圈內還沒打卡）、walk＝走過去（感應圈外）；null＝直接開卡 */
  first: 'scan' | 'walk' | null
  /** 螢幕閱讀器念的完整說明，灰色的會帶原因 */
  aria: string
  /** 點灰色的圈時顯示的一句（能用的是空字串） */
  why: string
}

export const ADOPT_NOTE = '認養即將開放'

/**
 * 拉近畫面的圈。順序固定。
 * 只有回報要先在這棵樹打卡（30 分鐘內不用再掃，見 recentCheckin）：回報要給市府受理，掃樹牌證明人在這棵樹旁。
 * 摸摸樹、留言在樹洞不用掃樹牌，站在感應圈內就能做（分隔島上的樹摸得到，但掃不到樹牌）。
 * 還沒打卡時圈照樣亮著，點了先做「下一步」（first）：在感應圈內 → 回報去掃樹牌（scan），其他直接開卡；
 * 在感應圈外 → 走過去（walk：Demo 是模擬走到樹旁，一般是畫出步行路線）。只有沒有位置時是灰的。
 * 認養永遠是灰的（即將開放）。樹的資料不用靠近，在底部「返回」旁邊。打卡過的互動點了在拉近畫面裡打開一張卡。
 */
export function focusActions(range: RangeInfo, checkedIn: boolean): FocusAction[] {
  const first: FocusAction['first'] = checkedIn ? null : range.inRange ? 'scan' : 'walk'
  const enabled = checkedIn || range.inRange || range.distance !== null
  const why = enabled ? '' : farNote(range)
  const main = (a: Pick<FocusAction, 'id' | 'label'>, desc: string): FocusAction => {
    // 只有回報要掃樹牌；摸摸樹、留言在樹洞在感應圈內就直接開卡
    const step = a.id !== 'report' && first === 'scan' ? null : enabled ? first : null
    return {
      ...a,
      size: 'main',
      enabled,
      first: step,
      why,
      aria: !enabled ? `${desc}（暫時不能用：${why}）` : step === 'scan' ? `${desc}（先掃樹牌打卡）` : step === 'walk' ? `${desc}（先走到樹旁）` : desc,
    }
  }
  return [
    main({ id: 'touch', label: '摸摸樹' }, '摸摸樹：呼吸、冥想或擁抱'),
    main({ id: 'report', label: '回報' }, '樹況回報'),
    main({ id: 'whisper', label: '留言在樹洞' }, '樹洞：對這棵樹說一句話'),
    { id: 'adopt', label: '認養', size: 'small', enabled: false, first: null, why: ADOPT_NOTE, aria: `認養（${ADOPT_NOTE}）` },
  ]
}

/**
 * 拉近畫面底部「返回」右邊的按鈕：「樹的資料」永遠在（不用靠近樹）；
 * 範圍外還沒打卡再加「怎麼走」（有位置才有）與 Demo 的「走過去」，走近之後拿掉。沒有「掃樹牌」鈕：點互動就會去掃。
 */
export function focusButtons(range: RangeInfo, checkedIn: boolean, demo: boolean): { route: boolean; walk: boolean } {
  if (checkedIn || range.inRange) return { route: false, walk: false }
  return { route: range.distance !== null, walk: demo }
}
