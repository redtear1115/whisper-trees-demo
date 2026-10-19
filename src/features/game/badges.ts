// 成長徽章：依自己的紀錄計算，不另外存（「回家的路」例外：靠 onboarding.homeScreenAt 旗標）。不做連續登入類的徽章。

import type { State } from '../../store'
import { dayKey } from '../../lib/seed'
import { firstLightEarned, newcomerDone, onboarding } from './onboarding'

export interface Badge {
  id: string
  name: string
  hint: string
  art: string
  earned: boolean
}

export function badges(s: State): Badge[] {
  const species = new Set(s.checkins.map((c) => c.species).filter(Boolean))
  const daysByTree = new Map<string, Set<string>>()
  for (const c of s.checkins) {
    const set = daysByTree.get(c.treeId) ?? new Set()
    set.add(dayKey(new Date(c.at)))
    daysByTree.set(c.treeId, set)
  }
  const waterDays = Object.values(s.watered).reduce((n, days) => n + days.length, 0)
  const list: Omit<Badge, 'art'>[] = [
    { id: 'first', name: '第一次相遇', hint: '第一次掃樹牌打卡', earned: s.checkins.length > 0 },
    { id: 'species-3', name: '認識三種樹', hint: '在 3 種不同的樹打卡', earned: species.size >= 3 },
    { id: 'species-10', name: '樹的朋友', hint: '在 10 種不同的樹打卡', earned: species.size >= 10 },
    { id: 'far-view', name: '遠遠看著你', hint: '用遠觀模式陪一棵安全島上的樹', earned: s.checkins.some((c) => c.result === 'farView') },
    { id: 'capsule', name: '時空膠囊', hint: '隔天以後回到同一棵樹', earned: [...daysByTree.values()].some((d) => d.size >= 2) },
    { id: 'wisher', name: '種下一個願望', hint: '在空樹穴許願', earned: s.myWishIds.length > 0 },
    { id: 'waterer', name: '澆水十次', hint: '幫許願澆水累計 10 次', earned: waterDays >= 10 },
    { id: 'night', name: '夜行者', hint: '在樹木休息的夜裡來看它', earned: s.checkins.some((c) => c.night) },
    { id: 'reporter', name: '樹的守望者', hint: '送出一筆樹況回報', earned: s.reports.length > 0 },
    { id: 'first-light', name: '第一道光', hint: '第一次收集到光點', earned: firstLightEarned(s) },
    { id: 'home-screen', name: '回家的路', hint: '從手機桌面的圖示打開曦語', earned: !!onboarding(s).homeScreenAt },
    { id: 'newcomer', name: '城市的新朋友', hint: '完成新手任務', earned: newcomerDone(s) },
  ]
  return list.map((b) => ({ ...b, art: `badge-${b.id}` }))
}
