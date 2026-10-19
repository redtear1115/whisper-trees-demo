// 新手引導：旗標存在 ext.onboarding（雲端是 users/{uid}.onboarding 的 map 欄位）。
// 一律用 patchOnboarding 寫，永遠以目前的值為底合併；自動寫入（桌面圖示、新手禮）要等 userReady。

import { getExt, getState, setExt, useStore, userReady, type State } from '../../store'
import { inventory } from './inventory'
import { baseLedger } from './ledger'

export interface Onboarding {
  /** 「收集光點」引導目前停在第幾步，從選單接著看 */
  tourStep?: number
  /** 按了「之後再說」 */
  tourDismissedAt?: number
  /** 第一次從手機桌面的圖示打開 */
  homeScreenAt?: number
  viewedCodexAt?: number
  viewedBadgesAt?: number
  /** 新手禮（草帽）送出的時間；擁有權由 inventory() 推算 */
  giftAt?: number
}

const EMPTY: Onboarding = {}

export function onboarding(s?: State): Onboarding {
  return getExt<Onboarding>('onboarding', EMPTY, s)
}

export function useOnboarding() {
  return useStore((s) => onboarding(s))
}

/** 唯一的寫入口：和目前的值合併，不會寫出只含局部欄位的新物件 */
export function patchOnboarding(partial: Partial<Onboarding>) {
  setExt('onboarding', { ...onboarding(), ...partial })
}

/**
 * 第一道光：存下來的流水帳裡有一筆帶 key 的正數（只有 award() 會寫）。
 * 刻意不用 ledger()，那個會混進 GM 在這台裝置的補發。
 */
export function firstLightEarned(s?: State): boolean {
  return baseLedger(s).some((e) => e.delta > 0 && !!e.key)
}

/** 送新手禮：只在拿到第一道光、還沒送過、而且使用者文件已載入時，把 giftAt 記下來。回傳這次有沒有送。 */
export function grantStarterGift(): boolean {
  if (!userReady() || onboarding().giftAt || !firstLightEarned()) return false
  patchOnboarding({ giftAt: Date.now() })
  return true
}

export type TaskId = 'shop' | 'codex' | 'whisper' | 'wish'

export interface Task {
  id: TaskId
  label: string
  to: string
  done: boolean
}

/** 新手任務（順序不拘）：每一項都由真實紀錄或看過的旗標推算 */
export function tasks(s?: State): Task[] {
  const st = s ?? getState()
  const inv = inventory(st)
  const ob = onboarding(st)
  return [
    {
      id: 'shop',
      label: '去商店換上新手禮，或買一件',
      to: '/shop',
      done: !!(inv.equipped.outfit || inv.equipped.frame) || Object.values(inv.civic).some((n) => n > 0),
    },
    { id: 'codex', label: '看看圖鑑與成就', to: '/codex', done: !!(ob.viewedCodexAt && ob.viewedBadgesAt) },
    {
      id: 'whisper',
      label: '在樹洞留一句話',
      to: '/',
      done: Object.values(st.whispers).some((l) => l.length > 0),
    },
    { id: 'wish', label: '在空樹穴許願', to: '/', done: st.myWishIds.length > 0 },
  ]
}

export function newcomerDone(s?: State): boolean {
  return tasks(s).every((t) => t.done)
}
