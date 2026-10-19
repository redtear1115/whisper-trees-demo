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
}

let session: Session = { backend: 'local', fallback: false, admin: 'no', migration: null }
const listeners = new Set<() => void>()

export const getSession = () => session

export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  listeners.forEach((l) => l())
}

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
