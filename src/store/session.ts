// 這個工作階段用哪個後端、是不是承辦人、有沒有待處理的遷移。UI 用 useSession() 讀。

import { useSyncExternalStore } from 'react'
import type { Connection } from './unavailable'

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
  /** 雲端的連線狀態：不是 ok 時頂端顯示（2026-10-21 起連不上也不退回本機模式，見 unavailable.ts） */
  connection: Connection
  /** Google 登入且在 admins 白名單裡 */
  admin: 'checking' | 'yes' | 'no'
  migration: { summary: MigrationSummary; running: boolean; error?: string } | null
  /** 雲端模式：目前這個 uid 的使用者文件已經載入（伺服器或快取）。本機模式一律 true。切換 uid 時重設。 */
  userReady: boolean
}

let session: Session = { backend: 'local', connection: 'ok', admin: 'no', migration: null, userReady: true }
const listeners = new Set<() => void>()

export const getSession = () => session

export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  listeners.forEach((l) => l())
}

/** 自動寫入（偵測桌面圖示、新手禮）要等這個為 true，避免用還沒載入的空資料去寫 */
export const userReady = () => session.userReady

/** 等使用者文件載入（最多 timeoutMs）；回傳是否已載入。打卡的掉落要先等它，不然會用空的 inventory 蓋掉雲端的造型 */
export function whenUserReady(timeoutMs = 8000): Promise<boolean> {
  if (session.userReady) return Promise.resolve(true)
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      listeners.delete(check)
      clearTimeout(timer)
      resolve(ok)
    }
    const check = () => session.userReady && done(true)
    const timer = setTimeout(() => done(session.userReady), timeoutMs)
    listeners.add(check)
  })
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
