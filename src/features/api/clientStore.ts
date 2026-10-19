// API 用戶端、呼叫紀錄、樹況回報的處理狀態：存在 store 的 ext（getExt/setExt）。
// 雲端模式下這三個 key 只寫本機覆寫層（localStorage），不進 Firestore（模擬用，沒有對應的安全規則）。

import { useMemo } from 'react'
import { getExt, setExt, useStore, type State } from '../../store'
import { BUILTIN_CLIENTS, newClient, revoke, rotateSecret, type ApiClient, type NewClientInput } from './clients'
import type { LogEntry } from './gateway'
import type { ReportReview } from './types'

export const CLIENTS_KEY = 'apiClients'
export const LOG_KEY = 'apiLog'
export const REVIEWS_KEY = 'reportReviews'

export interface ApiLog {
  /** 新到舊，最多 100 筆 */
  entries: (LogEntry & { clientId: string })[]
  lastUsed: Record<string, number>
}

const NO_CLIENTS: ApiClient[] = []
const NO_LOG: ApiLog = { entries: [], lastUsed: {} }
const NO_REVIEWS: Record<string, ReportReview> = {}
const LOG_CAP = 100

export const storedClients = (s?: State) => getExt<ApiClient[]>(CLIENTS_KEY, NO_CLIENTS, s)
export const apiLog = (s?: State) => getExt<ApiLog>(LOG_KEY, NO_LOG, s)
export const reportReviews = (s?: State) => getExt<Record<string, ReportReview>>(REVIEWS_KEY, NO_REVIEWS, s)

export const allClients = (s?: State): ApiClient[] => [...BUILTIN_CLIENTS, ...storedClients(s)]

export function useApiClients(): ApiClient[] {
  const stored = useStore((s) => storedClients(s))
  return useMemo(() => [...BUILTIN_CLIENTS, ...stored], [stored])
}

export const useApiLog = () => useStore((s) => apiLog(s))
export const useReportReviews = () => useStore((s) => reportReviews(s))

/** 建立；回傳的 secret 只此一次 */
export async function createApiClient(input: NewClientInput): Promise<{ client: ApiClient; secret: string }> {
  const out = await newClient(input, Date.now())
  setExt(CLIENTS_KEY, [...storedClients(), out.client])
  return out
}

export async function regenerateApiSecret(clientId: string): Promise<{ client: ApiClient; secret: string } | null> {
  const c = storedClients().find((x) => x.clientId === clientId)
  if (!c) return null
  const out = await rotateSecret(c, Date.now())
  setExt(CLIENTS_KEY, storedClients().map((x) => (x.clientId === clientId ? out.client : x)))
  return out
}

export function revokeApiClient(clientId: string) {
  setExt(CLIENTS_KEY, storedClients().map((x) => (x.clientId === clientId ? revoke(x, Date.now()) : x)))
}

export function recordApiCall(clientId: string, entry: LogEntry, markUsed: boolean) {
  const log = apiLog()
  setExt<ApiLog>(LOG_KEY, {
    entries: [{ ...entry, clientId }, ...log.entries].slice(0, LOG_CAP),
    lastUsed: markUsed ? { ...log.lastUsed, [clientId]: entry.at } : log.lastUsed,
  })
}

export function setReportReview(reportId: string, review: ReportReview) {
  setExt(REVIEWS_KEY, { ...reportReviews(), [reportId]: review })
}
