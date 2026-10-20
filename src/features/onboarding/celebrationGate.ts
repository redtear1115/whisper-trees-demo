// 慶祝視窗（第一道光、回家的路、城市的新朋友）正在顯示或馬上要顯示的訊號。
// 其他一次性的提問（例如打卡後的心情）要等慶祝視窗關掉再出現，不要疊在一起。
// OnboardingEffects 開關視窗時設定；等的人用 useCelebrationBlocking()。

import { useSyncExternalStore } from 'react'
import { isDemoMode, useStore, useUserReady } from '../../store'
import { firstLightEarned, onboarding } from '../game/onboarding'
import { firstLightCelebration, STEP_CELEBRATE, tourView } from './tour'

let open = false
const listeners = new Set<() => void>()

export function setCelebrationOpen(next: boolean) {
  if (open === next) return
  open = next
  listeners.forEach((l) => l())
}

function useCelebrationOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
  )
}

/** 引導正停在第 3 步（第一道光的慶祝由引導在地圖上畫） */
export function useTourOnCelebrate(): boolean {
  const ready = useUserReady()
  return useStore((s) => {
    const v = tourView({ ob: onboarding(s), firstLight: firstLightEarned(s), ready, demo: isDemoMode() })
    return v.open && v.step === STEP_CELEBRATE
  })
}

/**
 * 慶祝視窗開著，或剛拿到第一道光、視窗馬上要跳出來（OnboardingEffects 的 effect 還沒跑到，避免閃一下）。
 * 引導停在第 3 步時慶祝在地圖頁的引導抽屜裡，不在別的頁面，所以不算擋住。
 */
export function useCelebrationBlocking(): boolean {
  const showing = useCelebrationOpen()
  const ready = useUserReady()
  const tourOnCelebrate = useTourOnCelebrate()
  const pending = useStore(
    (s) =>
      firstLightCelebration({ ready, firstLight: firstLightEarned(s), celebratedAt: onboarding(s).firstLightCelebratedAt, tourOnCelebrate }) ===
      'dialog',
  )
  return showing || pending
}
