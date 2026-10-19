// 閘道在這個瀏覽器分頁裡的單例：token 存在記憶體、資料接 store。/developers 的試打與 MCP 試用共用。

import { allReports, allWishes, setWishStatus } from '../../store'
import { loadDistricts } from '../../lib/trees'
import { advance, orders } from '../vendor/orders'
import { allClients, recordApiCall, reportReviews, setReportReview } from './clientStore'
import { handleRequest, type GatewayDeps, type GatewayRequest, type GatewayResponse } from './gateway'
import { handleMcp } from './mcp'
import { workOrderRows } from './resources'
import { TokenStore } from './tokens'
import type { DataSource } from './types'

/** 「快轉」用：讓 token 過期可以現場看到 */
let offset = 0
const now = () => Date.now() + offset
export const advanceClock = (ms: number) => {
  offset += ms
}
export const clockOffset = () => offset

export const storeData: DataSource = {
  wishes: () => allWishes(),
  reports: () => allReports(),
  orders: () => orders(),
  reviews: () => reportReviews(),
  districts: () => loadDistricts(),
  setWishStatus,
  setReview: setReportReview,
  advanceOrder: (key, stage, opts) => advance(key, stage, opts),
}

const deps: GatewayDeps = {
  now,
  tokens: new TokenStore(now),
  registry: {
    find: (id) => allClients().find((c) => c.clientId === id),
    // 紀錄用真實時間，不跟著快轉
    record: (id, entry, markUsed) => recordApiCall(id, { ...entry, at: Date.now() }, markUsed),
  },
  data: storeData,
}

export const callApi = (req: GatewayRequest): Promise<GatewayResponse> => handleRequest(req, deps)
export const callMcp = (req: { headers?: Record<string, string>; body?: unknown }): Promise<GatewayResponse> => handleMcp(req, deps)

/** 試打的預設值要用得到真的 id：從 store 挑一筆案件、回報、工單 */
export function liveIds(): { caseId: string; reportId: string; workOrderId: string } {
  const wishes = storeData.wishes()
  const rows = workOrderRows(storeData)
  return {
    caseId: (wishes.find((w) => w.history[w.history.length - 1].status === 'received') ?? wishes[0])?.id ?? 'mock-5',
    reportId: storeData.reports()[0]?.id ?? 'mock-r1',
    workOrderId: (rows.find((r) => r.stage === 'new') ?? rows[0])?.id ?? 'wo_wish_mock-1',
  }
}
