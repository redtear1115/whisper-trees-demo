// 集章冊的「我的區」與零狀態：純函式，方便測試。規格見 docs/specs/08-extensions.md §10。

import { TAIPEI_DISTRICTS } from '../../store/types'
import type { District, DistrictStamps } from '../game/districts'
import type { Village } from '../../lib/villages'

/** 存的值是台北市 12 區之一才算；沒有、不認得（舊資料、被改過）都當沒有 */
export function asDistrict(v: unknown): District | null {
  return typeof v === 'string' && (TAIPEI_DISTRICTS as readonly string[]).includes(v) ? (v as District) : null
}

/** 地圖上目前選的區：使用者自己點的優先；還沒點過就是「我的區」（打開時就選好、卡片可見）；兩者都沒有就是空白的全市 */
export function selectedDistrict(picked: District | null, home: unknown): District | null {
  return picked ?? asDistrict(home)
}

/** 這一區還沒有任何章（一棵不同的樹都還沒打卡）：狀態卡顯示邀請，不顯示一排 0 */
export function isWaiting(b: Pick<DistrictStamps, 'distinct'> | undefined): boolean {
  return !!b && b.distinct === 0
}

export const WAITING_INVITATION = '這一區還是一張白紙。走到任何一棵樹旁掃樹牌，就會蓋上第一個章。'

/** 里還沒有任何一棵點亮（而且有樹可以點亮）：列表只放名字與淡虛線框，不寫「0／N 棵」 */
export function villageUntouched(v: Pick<Village, 'total'>, lit: number): boolean {
  return v.total > 0 && lit === 0
}

/** 里列表右側的字：點亮過才有數字；沒有樹的里說明沒有資料；還沒點亮的不寫 */
export function villageCountText(v: Pick<Village, 'total'>, lit: number): string {
  if (v.total === 0) return '沒有樹木資料'
  return lit === 0 ? '' : `${lit}／${v.total} 棵`
}

/** 全市地圖上面的一行：「我的區：大安區・3 棵」；還沒打卡過就是「我的區：文山區・還是一張白紙」 */
export function homeSummaryText(district: string, distinct: number): string {
  return `我的區：${district}・${distinct > 0 ? `${distinct} 棵` : '還是一張白紙'}`
}

/** 「已集 3 枚章」：併在「我的區」那一行；一枚都沒有就不寫（沒有 0 枚的負擔） */
export function stampCountText(n: number): string {
  return n > 0 ? `已集 ${n} 枚章` : ''
}

/**
 * 里列表分三段：走過的在前面；還沒走過的（有樹可以走）收在一個可展開的按鈕後面；
 * 沒有樹木資料的里（沒得走）另外放，不算「走過」也不算「還沒走過」。順序維持不變。
 */
export function splitUntouched<T extends { village: Pick<Village, 'total'>; lit: number }>(
  rows: readonly T[],
): { active: T[]; untouched: T[]; noData: T[] } {
  const active: T[] = []
  const untouched: T[] = []
  const noData: T[] = []
  for (const r of rows) (r.village.total === 0 ? noData : villageUntouched(r.village, r.lit) ? untouched : active).push(r)
  return { active, untouched, noData }
}
