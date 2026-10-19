// 這個工作階段用哪個後端、是不是承辦人、有沒有待處理的遷移。UI 用 useSession() 讀。

import { useSyncExternalStore } from 'react'

export interface MigrationSummary {
  wishes: number
  reports: number
  checkins: number
  /** 光點／造型紀錄 */
  progress: boolean
  whispers: number
}

export interface Session {
  backend: 'local' | 'cloud'
  /** 雲端失敗而退回本機：顯示「離線示範模式」橫幅 */
  fallback: boolean
  /** Google 登入且在 admins 白名單裡 */
  admin: 'checking' | 'yes' | 'no'
  migration: { summary: MigrationSummary; running: boolean; error?: string } | null
  /** 雲端模式：目前這個 uid 的使用者文件已經載入（伺服器或快取）。本機模式一律 true。切換 uid 時重設。 */
  userReady: boolean
}

let session: Session = { backend: 'local', fallback: false, admin: 'no', migration: null, userReady: true }
const listeners = new Set<() => void>()

export const getSession = () => session

export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  listeners.forEach((l) => l())
}

/** 自動寫入（偵測桌面圖示、新手禮）要等這個為 true，避免用還沒載入的空資料去寫 */
export const userReady = () => session.userReady

export function useSession(): Session {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSession,
  )
}

/** 承辦人：可以寫入雲端後台資料 */
export const canWriteAdmin = () => session.backend === 'cloud' && session.admin === 'yes'
/** 雲端模式但不是承辦人：後台改動只寫本機覆寫層 */
export const inDemoOverlay = () => session.backend === 'cloud' && session.admin !== 'yes'
