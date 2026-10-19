// 「上次有人拜訪這棵樹」：寂寞樹倍率用。
// 我們沒有全市的拜訪資料，所以這是**模擬**：由樹籍編號當種子，固定算出一個「幾天沒人來」。
// 如果使用者自己（在今天以前）去過，而且比模擬的更近，就用自己的那一次。

import { dayKey, seededInt } from '../../lib/seed'
import type { Checkin } from '../../store/types'

const DAY = 86_400_000

/** 模擬約 22% 的樹是 30 天以上沒人去的（30–120 天），其餘 1–29 天。同一棵樹永遠得到同一個數字。 */
export function mockDaysSinceVisit(treeId: string): number {
  if (seededInt(`${treeId}:last-visit`, 0, 99) < 22) return 30 + seededInt(`${treeId}:lonely-days`, 0, 90)
  return 1 + seededInt(`${treeId}:recent-days`, 0, 28)
}

/** 台北某一天 00:00 的毫秒時間 */
function startOfDay(now: Date): number {
  return Date.parse(`${dayKey(now)}T00:00:00+08:00`)
}

/** 距上次有人拜訪幾天。自己今天以前的打卡比模擬的更近就用自己的；今天的打卡不算（不然永遠不寂寞）。 */
export function daysSinceVisit(
  treeId: string,
  checkins: readonly Pick<Checkin, 'treeId' | 'at'>[],
  now = new Date(),
): { days: number; source: 'mock' | 'own' } {
  const mock = mockDaysSinceVisit(treeId)
  const before = startOfDay(now)
  let own = -Infinity
  for (const c of checkins) if (c.treeId === treeId && c.at < before && c.at > own) own = c.at
  if (own === -Infinity) return { days: mock, source: 'mock' }
  const ownDays = Math.floor((now.getTime() - own) / DAY)
  return ownDays < mock ? { days: ownDays, source: 'own' } : { days: mock, source: 'mock' }
}
