// 「收集光點」引導的步驟邏輯與裝置判斷。全是純函式，元件只負責畫。
// 步驟：1 光點是什麼 → 2 去掃樹牌 → 3 第一道光慶祝（含新手禮）→ 4 加到主畫面。tourStep 存目前停的步驟，5 = 走完。

import type { Onboarding } from '../game/onboarding'

export const STEP_INTRO = 1
export const STEP_SCAN = 2
export const STEP_CELEBRATE = 3
export const STEP_HOME = 4
export const STEP_DONE = 5

export interface TourInput {
  ob: Onboarding
  /** 已經收集到第一道光 */
  firstLight: boolean
  /** 這個 uid 的使用者文件已載入；沒載入前不知道有沒有按過「之後再說」，所以先不顯示 */
  ready: boolean
  /** Demo 模式（?demo=1）：現場展示不自動跳引導，要看從選單打開 */
  demo?: boolean
}

export interface TourView {
  open: boolean
  /** 目前該畫哪一步（1–4） */
  step: number
  /** 開著、但 tourStep 還沒存過：呼叫端要補存 tourStep: 1，之後才算「開始過」 */
  needsInit: boolean
}

/**
 * 引導要不要開、停在哪一步。
 * - 還沒拿到第一道光：沒按過「之後再說」就開（只會在第 1、2 步）。
 * - 已拿到第一道光：只有「開始過」（tourStep 有存）的人才接著看，直接到第 3 步慶祝；
 *   舊使用者（早就有光點、沒看過引導）不會被打擾，要看可以從選單進。
 * - 走完（tourStep = 5）或按過「之後再說」就收起。
 * - Demo 模式不自動打開；從選單打開過（tourDismissedAt 被設成 0）才顯示。
 */
export function tourView({ ob, firstLight, ready, demo }: TourInput): TourView {
  const stored = ob.tourStep
  const closed: TourView = { open: false, step: STEP_INTRO, needsInit: false }
  if (!ready || ob.tourDismissedAt || (stored !== undefined && stored >= STEP_DONE)) return closed
  if (demo && ob.tourDismissedAt === undefined) return closed
  if (firstLight && stored === undefined) return closed
  let step = Math.min(Math.max(stored ?? STEP_INTRO, STEP_INTRO), STEP_HOME)
  if (firstLight && step < STEP_CELEBRATE) step = STEP_CELEBRATE
  if (!firstLight && step > STEP_SCAN) step = STEP_SCAN
  return { open: true, step, needsInit: stored === undefined }
}

/**
 * 從選單「新手引導」重新打開要寫的欄位。
 * 「之後再說」用 0 表示沒收起（雲端是逐欄合併，欄位寫 undefined 不會清掉）；已走完就從第 1 步重看。
 */
export function reopenPatch(ob: Onboarding): Pick<Onboarding, 'tourDismissedAt' | 'tourStep'> {
  const stored = ob.tourStep
  return { tourDismissedAt: 0, tourStep: stored === undefined || stored >= STEP_DONE ? STEP_INTRO : stored }
}

/**
 * 「第一道光」要怎麼慶祝：引導正停在第 3 步就由引導畫（只記下慶祝過）；
 * 否則（略過了引導、Demo 模式、舊使用者）跳一次慶祝視窗。
 */
export function firstLightCelebration(a: {
  ready: boolean
  firstLight: boolean
  celebratedAt?: number
  tourOnCelebrate: boolean
}): 'none' | 'mark' | 'dialog' {
  if (!a.ready || !a.firstLight || a.celebratedAt) return 'none'
  return a.tourOnCelebrate ? 'mark' : 'dialog'
}

// ---------- 桌面圖示（standalone） ----------

interface DisplayEnv {
  matchMedia?: (q: string) => { matches: boolean }
  navigator?: object
}

/** 從手機桌面的圖示打開（iOS 用 navigator.standalone，其他看 display-mode） */
export function isStandalone(env: DisplayEnv = typeof window === 'undefined' ? {} : window): boolean {
  try {
    if (env.matchMedia?.('(display-mode: standalone)').matches) return true
    return (env.navigator as { standalone?: boolean } | undefined)?.standalone === true
  } catch {
    return false
  }
}

/** 該記下「回家的路」嗎：從桌面圖示打開、使用者文件已載入、還沒記過 */
export function shouldRecordHomeScreen(a: { standalone: boolean; ready: boolean; homeScreenAt?: number }): boolean {
  return a.standalone && a.ready && !a.homeScreenAt
}

// ---------- 加到主畫面的方式 ----------

export type InstallPlatform = 'in-app' | 'ios-safari' | 'ios-other' | 'android' | 'other'

/** 依瀏覽器決定要給哪一種說明。inApp 由 firebase.ts 的 inAppBrowser() 判斷後傳進來。 */
export function installPlatform(
  ua: string,
  inApp: boolean,
  touchPoints = 0,
): InstallPlatform {
  if (inApp) return 'in-app'
  // iPadOS 的 Safari 會假裝成 Mac，要靠觸控點數分辨
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua) ? 'ios-other' : 'ios-safari'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}
