import { useEffect, useRef } from 'react'
import { DOUBLE_TAP_MS } from './tap'

/** 「減少動態」時不要平滑捲動 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** 地圖下緣至少要留在畫面內幾 px（CSS px，從畫面頂端算） */
export const KEEP_MAP_PX = 56

/**
 * 要往下捲多少，才剛好看得到狀態卡的標題列：
 * 標題下緣超出可見範圍多少就捲多少（已經看得到就不捲），而且不捲到地圖下緣離開畫面。
 * headingBottom／viewBottom／anchorBottom 都是相對於視窗頂端的 y。
 */
export function revealDelta(o: { headingBottom: number; viewBottom: number; anchorBottom?: number }): number {
  const need = Math.max(0, o.headingBottom - o.viewBottom)
  if (o.anchorBottom === undefined) return need
  return Math.min(need, Math.max(0, o.anchorBottom - KEEP_MAP_PX))
}

/**
 * 選了東西之後：焦點移到下方狀態卡的標題（鍵盤與讀屏跟著走），並且只捲到剛好看得到標題列，
 * 地圖的下緣仍留在畫面內（不整張卡捲進來、也不讓地圖捲走）。
 * key 變了（選了另一個）就再做一次；key 是 null 不做。
 * 捲動等「點兩下」的時間窗過了才做：點第一下就捲走，第二下會點到別的東西。
 */
export function useReveal<T extends HTMLElement>(key: string | null, anchorSelector = '.atlas-panel') {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (key === null) return
    const el = ref.current
    if (!el) return
    const heading = el.querySelector<HTMLElement>('[data-reveal-heading]')
    heading?.focus({ preventScroll: true })
    const t = window.setTimeout(() => {
      if (!heading) return
      const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect().top ?? window.innerHeight
      const anchor = el.closest('.atlas')?.querySelector(anchorSelector)?.getBoundingClientRect()
      const dy = revealDelta({
        headingBottom: heading.getBoundingClientRect().bottom + 14,
        viewBottom: Math.min(nav, window.innerHeight) - 8,
        anchorBottom: anchor?.bottom,
      })
      if (dy > 0) window.scrollBy({ top: dy, behavior: scrollBehavior() })
    }, DOUBLE_TAP_MS + 40)
    return () => window.clearTimeout(t)
  }, [key, anchorSelector])
  return ref
}
