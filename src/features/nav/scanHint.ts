// 首頁地圖上選了哪一棵樹：底部中間的「掃樹牌」按鈕帶著它去掃描頁（掃描頁提示「要打卡的是：…」）。
// 只是畫面之間的暫存，不是使用者資料，所以不進 store。

import { useSyncExternalStore } from 'react'

let treeId: string | null = null
const listeners = new Set<() => void>()

export function setScanHint(id: string | null) {
  if (id === treeId) return
  treeId = id
  listeners.forEach((l) => l())
}

export function useScanHint(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => treeId,
  )
}
