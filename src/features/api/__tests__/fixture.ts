import type { OrderStage } from '../../vendor/orders'
import type { TreeReport, Wish, WishStatus } from '../../../store/types'
import { BUILTIN_CLIENTS, DEMO_CREDENTIALS, type ApiClient } from '../clients'
import { handleRequest, type GatewayDeps, type GatewayRequest, type GatewayResponse, type LogEntry } from '../gateway'
import { TokenStore } from '../tokens'
import type { DataSource, ReportReview } from '../types'

const T0 = Date.UTC(2026, 9, 20, 4)

const wish = (id: string, district: string, status: WishStatus, seedWater: number, reason?: string): Wish => ({
  id,
  pitId: `pit-${id}`,
  lngLat: [121.5, 25.03],
  road: `${district}路`,
  district,
  reasons: ['太曬'],
  feasibility: 'emptyPit',
  createdAt: T0 - 86_400_000,
  seedWater,
  water: 0,
  history: [{ status, at: T0 - 3600_000, ...(reason ? { reason } : {}) }],
  mock: true,
})

const report = (id: string, district: string): TreeReport => ({
  id,
  treeId: 'DA0000000001',
  species: '茄苳',
  road: `${district}路`,
  district,
  kind: 'sick',
  details: ['病蟲害'],
  note: 'x',
  hasPhoto: false,
  at: T0 - 7200_000,
  mock: true,
})

export interface Fixture {
  clock: { t: number }
  deps: GatewayDeps
  clients: ApiClient[]
  logs: (LogEntry & { clientId: string })[]
  wishes: Wish[]
  orders: Record<string, { stage: OrderStage; at: number; note?: string }>
  reviews: Record<string, ReportReview>
  call: (req: GatewayRequest) => Promise<GatewayResponse>
  /** 用 form 取 token；失敗時丟出回應 */
  token: (clientId: string, secret: string, scope?: string) => Promise<string>
  tokenOf: (name: 'gov' | 'green' | 'cool') => Promise<string>
}

export function makeFixture(extraClients: ApiClient[] = []): Fixture {
  const clock = { t: T0 }
  const clients = [...BUILTIN_CLIENTS.map((c) => ({ ...c })), ...extraClients]
  const logs: Fixture['logs'] = []
  const wishes = [
    wish('c1', '中正區', 'scheduled', 5), // 綠野造園
    wish('c2', '大安區', 'received', 9), // 蔭涼植栽
    wish('c3', '文山區', 'rejected', 1, '地下管線'),
    wish('c4', '中正區', 'received', 2),
  ]
  const orders: Fixture['orders'] = {}
  const reviews: Fixture['reviews'] = {}
  const data: DataSource = {
    wishes: () => wishes,
    reports: () => [report('r1', '大安區'), report('r2', '中正區')],
    orders: () => orders,
    reviews: () => reviews,
    districts: async () => [
      { district: '中正區', trees_per_km: 100 },
      { district: '大安區', trees_per_km: 150 },
      { district: '文山區', trees_per_km: 60 },
    ],
    setWishStatus(id, status, reason) {
      const i = wishes.findIndex((w) => w.id === id)
      if (i < 0) return false
      wishes[i] = { ...wishes[i], history: [...wishes[i].history, { status, at: clock.t, ...(reason ? { reason } : {}) }] }
      return true
    },
    setReview: (id, r) => {
      reviews[id] = r
    },
    advanceOrder(key, stage, opts) {
      orders[key] = { stage, at: clock.t, note: opts.note }
      if (stage === 'done' && opts.wishId) data.setWishStatus(opts.wishId, 'planted')
    },
  }
  const deps: GatewayDeps = {
    now: () => clock.t,
    tokens: new TokenStore(() => clock.t),
    registry: {
      find: (id) => clients.find((c) => c.clientId === id),
      record: (clientId, entry) => {
        logs.push({ ...entry, clientId })
      },
    },
    data,
  }
  const call = (req: GatewayRequest) => handleRequest(req, deps)
  const token = async (clientId: string, secret: string, scope?: string) => {
    const r = await call({
      method: 'POST',
      url: '/oauth/token',
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret, ...(scope ? { scope } : {}) }).toString(),
    })
    if (r.status !== 200) throw r
    return (r.body as { access_token: string }).access_token
  }
  const tokenOf: Fixture['tokenOf'] = (name) => {
    const d = DEMO_CREDENTIALS[{ gov: 0, green: 1, cool: 2 }[name]]
    return token(d.clientId, d.secret)
  }
  return { clock, deps, clients, logs, wishes, orders, reviews, call, token, tokenOf }
}

export const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
