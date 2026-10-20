// 新手引導：旗標存在 ext.onboarding（雲端是 users/{uid}.onboarding 的 map 欄位）。
// 一律用 patchOnboarding 寫，永遠以目前的值為底合併；自動寫入（桌面圖示、新手禮）要等 userReady。

import { getExt, getState, setExt, useStore, userReady, type State } from '../../store'
import { inventory } from './inventory'
import { TAIPEI_DISTRICTS } from '../../store/types'
import { baseLedger } from './ledger'

export interface Onboarding {
  /** 陪你的動物（地圖上代表你）：'taiwan-dog' | 'leopard-cat' | 'blue-magpie' | 'malayan-night-heron' | 'pangolin'（舊值 night-heron 算黑冠麻鷺、squirrel 算預設）；沒選過就是臺灣黑狗，見 features/avatar/animals.ts */
  animal?: string
  /** 我的區：和 TAIPEI_DISTRICTS／PREFIX_DISTRICT 一模一樣的中文區名（如「大安區」）。沒設過就是沒有；讀請用 homeDistrict()。 */
  homeDistrict?: string
  /**
   * 這個區是怎麼來的：'other' = 選了「其他（不在台北市）」，由定位或亂數決定；'pick' = 自己點選的。
   * 雲端是逐欄合併、欄位清不掉，所以從「其他」改成自己點選時寫 'pick'，不寫 undefined。
   */
  homeDistrictChoice?: 'other' | 'pick'
  /** 「收集光點」引導目前停在第幾步，從「我的」接著看。0 = 選動物與區、1–4 = 其餘步驟、5 = 走完 */
  tourStep?: number
  /** 第 0 步的小步驟：'animal'（沒有就是它）→ 'district'；只在 tourStep 是 0 時有意思，見 features/onboarding/tour.ts */
  tourSub?: 'animal' | 'district'
  /** 按了「之後再說」 */
  tourDismissedAt?: number
  /** 第一次從手機桌面的圖示打開 */
  homeScreenAt?: number
  viewedCodexAt?: number
  viewedBadgesAt?: number
  /** 新手禮（橡實帽）送出的時間；擁有權由 inventory() 推算 */
  giftAt?: number
  /** 收合 /explore 的新手任務卡 */
  tasksCollapsed?: boolean
  /** 「城市的新朋友」慶祝過的時間，只慶祝一次 */
  newcomerCelebratedAt?: number
  /** 「第一道光」慶祝過了（引導第 3 步或略過引導後的慶祝視窗，只跳一次） */
  firstLightCelebratedAt?: number
  /** 跳過「獲得徽章」視窗的徽章 id（每枚只跳一次）；沒有這個欄位的舊使用者，第一次載入時把已經有的全記進來、不跳 */
  badgesCelebrated?: string[]
}

const EMPTY: Onboarding = {}

export function onboarding(s?: State): Onboarding {
  return getExt<Onboarding>('onboarding', EMPTY, s)
}

export function useOnboarding() {
  return useStore((s) => onboarding(s))
}

/** 我的區（中文區名，如「大安區」）；沒設過、或存的值不是台北市 12 區之一就是 undefined */
export function homeDistrict(s?: State): string | undefined {
  return homeDistrictOf(onboarding(s))
}

/** 同上，但直接讀一份 Onboarding（元件用 useOnboarding() 拿到的值） */
export function homeDistrictOf(ob: Onboarding): string | undefined {
  return (TAIPEI_DISTRICTS as readonly string[]).includes(ob.homeDistrict as string) ? ob.homeDistrict : undefined
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
  /** 去哪裡做的一句說明（連到地圖的任務才有） */
  hint?: string
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
      done: !!(inv.equipped.outfit || inv.equipped.frame),
    },
    {
      id: 'codex',
      label: '看看圖鑑與成就',
      hint: '圖鑑在「集章冊 › 探索」，成就徽章在「我的」',
      to: '/stamps?tab=explore',
      done: !!(ob.viewedCodexAt && ob.viewedBadgesAt),
    },
    {
      id: 'whisper',
      label: '在樹洞留一句話',
      hint: '到地圖點一棵樹，進樹的頁面',
      to: '/',
      done: Object.values(st.whispers).some((l) => l.length > 0),
    },
    { id: 'wish', label: '在空樹穴許願', hint: '到地圖點一個空樹穴', to: '/', done: st.myWishIds.length > 0 },
  ]
}

export function newcomerDone(s?: State): boolean {
  return tasks(s).every((t) => t.done)
}

/** 地圖上的「新手任務 n/4」小入口：拿到第一道光、引導已收起或走完、任務還沒全做完才出現 */
export function showTasksChip(a: { ready: boolean; firstLight: boolean; tourOpen: boolean; allDone: boolean }): boolean {
  return a.ready && a.firstLight && !a.tourOpen && !a.allDone
}

/** 該慶祝「城市的新朋友」嗎：使用者文件已載入、4 項都完成、還沒慶祝過 */
export function shouldCelebrateNewcomer(a: { ready: boolean; done: boolean; celebratedAt?: number }): boolean {
  return a.ready && a.done && !a.celebratedAt
}
