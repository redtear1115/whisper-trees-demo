import { useEffect, useRef } from 'react'
import { DOUBLE_TAP_MS } from './tap'

/** 「減少動態」時不要平滑捲動 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/**
 * 選了東西之後，讓下方的狀態卡看得到：焦點移到卡片標題（鍵盤與讀屏跟著走），並把卡片捲進畫面。
 * key 變了（選了另一個）就再做一次；key 是 null 不做。
 * 捲動等「點兩下」的時間窗過了才做：點第一下就捲走，第二下會點到別的東西。
 */
export function useReveal<T extends HTMLElement>(key: string | null) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (key === null) return
    const el = ref.current
    if (!el) return
    el.querySelector<HTMLElement>('[data-reveal-heading]')?.focus({ preventScroll: true })
    const t = window.setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() }), DOUBLE_TAP_MS + 40)
    return () => window.clearTimeout(t)
  }, [key])
  return ref
}
