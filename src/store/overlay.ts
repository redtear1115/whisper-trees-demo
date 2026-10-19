// 「示範：只在這台裝置」的本機覆寫層。
// 不是承辦人（沒有 Google 登入＋admins 白名單）的人在後台改狀態、推進工單、改 GM 設定、補發光點，
// 都只寫在這裡（localStorage），疊在雲端資料上面顯示，絕不寫進雲端；評審仍然可以走完 Demo 路線。

import type { StatusEvent } from './types'

const KEY = 'whisper-trees:overlay:v1'

export interface Overlay {
  /** 許願 id → 在雲端歷程後面疊上的狀態事件 */
  wishEvents: Record<string, StatusEvent[]>
  vendor: Record<string, unknown>
  /** undefined：沒改過，用雲端的；{}：恢復預設 */
  gm?: unknown
  ledger: unknown[]
  /** 模擬用的 ext（API 用戶端、呼叫紀錄、回報處理）：雲端模式只存這裡，不進 Firestore */
  ext?: Record<string, unknown>
}

export const emptyOverlay = (): Overlay => ({ wishEvents: {}, vendor: {}, ledger: [] })

export const OVERLAY_KEY = KEY

export function loadOverlay(): Overlay {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...emptyOverlay(), ...JSON.parse(raw) } : emptyOverlay()
  } catch {
    return emptyOverlay()
  }
}

export function saveOverlay(o: Overlay) {
  try {
    localStorage.setItem(KEY, JSON.stringify(o))
  } catch {
    // 只留在記憶體
  }
}
