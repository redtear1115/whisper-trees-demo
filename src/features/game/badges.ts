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
  /** 已得到時顯示的一句話：你做了什麼才得到（hint 是還沒得到時的提示） */
  note: string
}

/** 已得到時的說明：用過去式講「你做了什麼」，新使用者看得懂為什麼這枚亮了 */
const EARNED_NOTE: Record<string, string> = {
  first: '你第一次掃樹牌打卡了',
  'species-3': '你在 3 種不同的樹打過卡',
  'species-10': '你在 10 種不同的樹打過卡',
  'far-view': '你在遠處陪了一棵安全島上的樹',
  capsule: '你隔了幾天又回到同一棵樹',
  wisher: '你替一個空樹穴許了願',
  waterer: '你幫願望澆了 10 次水',
  night: '你在樹木休息的夜裡來看過它',
  reporter: '你替樹送出了一筆樹況回報',
  'first-light': '你收集了第一個光點',
  'home-screen': '你從桌面圖示打開了曦語',
  newcomer: '你完成了新手任務',
}

/**
 * 徽章區標題下的一行：還沒有就說做一件小事就會亮；只有一枚就直接說為什麼
 * （「第一道光：你收集了第一個光點」）；多枚列前兩枚的名字。
 */
export function badgeSummary(list: readonly Badge[]): string {
  const got = list.filter((b) => b.earned)
  if (got.length === 0) return '做到一件小事就會亮起，不用急'
  if (got.length === 1) return `${got[0].name}：${got[0].note}`
  return `${got.slice(0, 2).map((b) => b.name).join('、')}${got.length > 2 ? '…' : ''}`
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
  const list: Omit<Badge, 'art' | 'note'>[] = [
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
  return list.map((b) => ({ ...b, art: `badge-${b.id}`, note: EARNED_NOTE[b.id] ?? b.hint }))
}

/** 這三枚有自己的慶祝（引導或專屬視窗），通用的「獲得徽章」視窗不跳 */
export const OWN_CELEBRATION: readonly string[] = ['first-light', 'newcomer', 'home-screen']

/**
 * 該跳哪幾枚「獲得徽章」：已得到、還沒跳過、不是自己有慶祝的那三枚。
 * celebrated 是 undefined（舊使用者第一次載入）時不跳，只把已經有的記下來（seed），免得一次跳一堆。
 */
export function badgesToCelebrate(earnedIds: readonly string[], celebrated: readonly string[] | undefined): { show: string[]; record: string[] } {
  if (!celebrated) return { show: [], record: [...earnedIds] }
  const show = earnedIds.filter((id) => !celebrated.includes(id) && !OWN_CELEBRATION.includes(id))
  return { show, record: show.length ? [...celebrated, ...show] : [...celebrated] }
}
