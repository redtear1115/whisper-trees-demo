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

/** 底部導覽中間浮出的掃樹牌圓鈕高出導覽多少（CSS px；.cta-disc 的 -30px 外距再加外框） */
export const SCAN_DISC_RISE_PX = 34

/**
 * 「看我的區」：要把整張卡片放進頂端（Demo 細條或畫面頂）與底部導覽加掃樹牌圓鈕之間，要捲多少（正數往下捲、負數往上捲）。
 * 放得下：卡片下緣停在 bottomEdge（已經在範圍內就不動）；放不下：卡片上緣停在 topEdge，標題與主要按鈕先看得到。
 * 所有數字都是相對於視窗頂端的 y。
 */
export function fitDelta(o: { cardTop: number; cardBottom: number; topEdge: number; bottomEdge: number }): number {
  const height = o.cardBottom - o.cardTop
  if (height > o.bottomEdge - o.topEdge) return o.cardTop - o.topEdge
  if (o.cardTop < o.topEdge) return o.cardTop - o.topEdge
  if (o.cardBottom > o.bottomEdge) return o.cardBottom - o.bottomEdge
  return 0
}

/** 目前畫面可以放卡片的範圍：Demo 細條之下、導覽與掃樹牌圓鈕之上（各留 8 px） */
export function visibleBand(): { topEdge: number; bottomEdge: number } {
  const badge = document.querySelector('.demo-badge')?.getBoundingClientRect()
  const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect().top ?? window.innerHeight
  return { topEdge: (badge ? badge.bottom : 0) + 8, bottomEdge: Math.min(nav, window.innerHeight) - SCAN_DISC_RISE_PX - 8 }
}

/**
 * 選了東西之後：焦點移到下方狀態卡的標題（鍵盤與讀屏跟著走），並且只捲到剛好看得到標題列，
 * 地圖的下緣仍留在畫面內（不整張卡捲進來、也不讓地圖捲走）。
 * key 變了（選了另一個）就再做一次；key 是 null 不做。
 * 捲動等「點兩下」的時間窗過了才做：點第一下就捲走，第二下會點到別的東西。
 */
export function useReveal<T extends HTMLElement>(key: string | null, anchorSelector = '.atlas-panel', full = false) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (key === null) return
    const el = ref.current
    if (!el) return
    const heading = el.querySelector<HTMLElement>('[data-reveal-heading]')
    heading?.focus({ preventScroll: true })
    if (full) {
      // 「看我的區」：整張卡片捲進頂端與導覽之間（不是按地圖，沒有點兩下的時間窗要等）
      const raf = window.requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const dy = fitDelta({ cardTop: r.top, cardBottom: r.bottom, ...visibleBand() })
        if (dy !== 0) window.scrollBy({ top: dy, behavior: scrollBehavior() })
      })
      return () => window.cancelAnimationFrame(raf)
    }
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
  }, [key, anchorSelector, full])
  return ref
}
